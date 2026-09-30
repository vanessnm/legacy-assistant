// src/api-agent.js
const { sql } = require('../config/database');
const path = require('path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

// Configuration d'Ollama
const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODELE_IA = "llama3.1:8b";

// ---------------------------------------------------------------
// CLIENT MCP : on se connecte à notre propre mcp-server.js
// Express (ce fichier) joue le rôle de "Client MCP / Orchestrateur"
// mcp-server.js joue le rôle de "Serveur MCP" qui expose les outils
// ---------------------------------------------------------------

let clientMCP = null;
let outilsDisponibles = [];

async function initialiserMCP() {
    if (clientMCP) return clientMCP;

    console.log("🔌 [MCP] Connexion au serveur de connecteurs (mcp-server.js)...");

    const transport = new StdioClientTransport({
        command: 'node',
        args: [path.join(__dirname, 'mcp-server.js')]
    });

    clientMCP = new Client(
        { name: "assistant-ia-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await clientMCP.connect(transport);

    const { tools } = await clientMCP.listTools();
    outilsDisponibles = tools;

    console.log(`✅ [MCP] Connecté ! ${tools.length} outil(s) disponible(s) : ${tools.map(t => t.name).join(', ')}`);

    return clientMCP;
}

/**
 * Convertit les outils MCP au format attendu par Ollama (style OpenAI "tools")
 */
function formaterOutilsPourOllama() {
    return outilsDisponibles.map(outil => ({
        type: "function",
        function: {
            name: outil.name,
            description: outil.description,
            parameters: outil.inputSchema
        }
    }));
}

async function chargerHistoriqueSession(idSession) {
    try {
        const request = new sql.Request();
        request.input('idSession', sql.Int, idSession);

        const result = await request.query(`
      SELECT role, contenu 
      FROM Messages 
      WHERE id_session = @idSession 
      ORDER BY date_envoi ASC
    `);

        return result.recordset.map(msg => ({
            role: msg.role,
            content: msg.contenu
        }));
    } catch (err) {
        console.error("Erreur lors du chargement de l'historique depuis SQL :", err);
        return [];
    }
}

/**
 * Sauvegarde chaque nouveau message (utilisateur et IA) dans SQL Server
 */
async function sauvegarderMessage(idSession, role, contenu) {
    try {
        const request = new sql.Request();
        request.input('idSession', sql.Int, idSession);
        request.input('role', sql.VarChar, role);
        request.input('contenu', sql.Text, contenu);

        await request.query(`
      INSERT INTO Messages (id_session, role, contenu, date_envoi)
      VALUES (@idSession, @role, @contenu, GETDATE())
    `);
    } catch (err) {
        console.error("Erreur de sauvegarde dans SQL :", err);
    }
}

const INSTRUCTION_SYSTEME = {
    role: 'system',
    content: "Tu es un assistant IA généraliste et amical, comme un assistant conversationnel normal. Réponds toujours directement et naturellement, sans jamais expliquer ta démarche ni faire de meta-commentaire.\n\nSi des résultats de l'outil analyser_code_legacy sont présents dans la conversation (role: tool), base ta réponse UNIQUEMENT sur les chiffres exacts qu'il retourne (nombre de lignes, nombre de fonctions, lignes trop longues, dette technique, score et niveau de complexité). Ne fais jamais ta propre relecture manuelle du code en remplacement de ces résultats : rapporte fidèlement les chiffres reçus, en français, de façon claire et concise."
};

/**
 * Détecte si un message ressemble à une demande d'analyse de code.
 * On ne propose l'outil à Ollama QUE si ça semble pertinent, pour éviter
 * qu'il soit distrait par l'outil lors d'une conversation normale.
 */
function ressembleADuCode(message) {
    const indicesDeCode = /[{};]|function\s|def\s|=>|console\.log|analyse\s?r?\s+ce\s+code|analyser?\s+le\s+code/i;
    return indicesDeCode.test(message);
}

/**
 * Appelle Ollama avec l'historique, et les outils seulement si c'est pertinent
 */
async function appellerOllama(messages, avecOutils) {
    const corpsRequete = {
        model: MODELE_IA,
        messages: [INSTRUCTION_SYSTEME, ...messages],
        stream: false
    };

    if (avecOutils) {
        corpsRequete.tools = formaterOutilsPourOllama();
    }

    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpsRequete)
    });

    if (!response.ok) {
        throw new Error(`Erreur Ollama: ${response.statusText}. Vérifie qu'Ollama est bien démarré.`);
    }

    const data = await response.json();
    return data.message;
}

/**
 * Orchestre la discussion : sauvegarde, mémoire, appel Ollama, et function calling via MCP
 */
async function discuterAvecIA(idSession, messageUtilisateur) {
    // 0. S'assurer que le client MCP est connecté
    await initialiserMCP();

    // 1. Stocker ce que l'utilisateur vient de taper
    await sauvegarderMessage(idSession, 'user', messageUtilisateur);

    // 2. Charger tout le passé de cette session
    const historique = await chargerHistoriqueSession(idSession);

    // 3. Premier appel à Ollama
    const proposerOutils = ressembleADuCode(messageUtilisateur);
    let reponseIA = await appellerOllama(historique, proposerOutils);

    let tours = 0;
    const MAX_TOURS = 3;

    // BOUCLE DE FUNCTION CALLING AMÉLIORÉE
    while (tours < MAX_TOURS) {
        let outilsADeclencher = [];

        // Cas A : le modèle supporte nativement les tool_calls d'Ollama
        if (reponseIA.tool_calls && reponseIA.tool_calls.length > 0) {
            outilsADeclencher = reponseIA.tool_calls;
        }
        // Cas B : le modèle a écrit le JSON textuellement dans 'content' (filet de sécurité)
        else if (reponseIA.content && reponseIA.content.trim().startsWith('{')) {
            try {
                const potentielJSON = JSON.parse(reponseIA.content.trim());
                if (potentielJSON.name || (potentielJSON.function && potentielJSON.function.name)) {
                    // On normalise le faux pas du modèle au format standard
                    outilsADeclencher = [{
                        id: `call_${Date.now()}`, // ID fictif requis pour le protocole
                        type: "function",
                        function: {
                            name: potentielJSON.name || potentielJSON.function.name,
                            arguments: potentielJSON.parameters || potentielJSON.function.arguments || {}
                        }
                    }];
                    // On synchronise la structure pour que l'historique reste propre
                    reponseIA.tool_calls = outilsADeclencher;
                }
            } catch (e) {
                // Ce n'était pas du JSON valide, on passe outre
            }
        }

        // Si aucun outil n'est détecté, on sort de la boucle immédiatement
        if (outilsADeclencher.length === 0) {
            break;
        }

        tours++;
        console.log(`🔧 [MCP] L'IA demande à utiliser ${outilsADeclencher.length} outil(s) (tour ${tours})...`);

        // On pousse la demande de l'assistant (contenant les tool_calls) dans l'historique
        historique.push(reponseIA);

        for (const appel of outilsADeclencher) {
            const nomOutil = appel.function.name;
            // Parfois les arguments arrivent déjà sous forme d'objet, parfois en string JSON
            const argumentsOutil = typeof appel.function.arguments === 'string'
                ? JSON.parse(appel.function.arguments)
                : appel.function.arguments;

            console.log(`   ↳ Appel de "${nomOutil}" avec :`, argumentsOutil);

            const resultatOutil = await clientMCP.callTool({
                name: nomOutil,
                arguments: argumentsOutil
            });

            const texteResultat = resultatOutil.content.map(c => c.text).join('\n');
            console.log(`   ↳ Résultat reçu du serveur MCP :`, texteResultat);

            // Formatage standardisé pour Ollama / OpenAI
            historique.push({
                role: 'tool',
                tool_call_id: appel.id || `call_${tours}`,
                name: nomOutil,
                content: texteResultat
            });
        }

        // On redemande à Ollama de générer sa réponse finale (ou un autre outil)
        reponseIA = await appellerOllama(historique, true);
    }

    const texteReponse = reponseIA.content;

    // 6. Sauvegarder la réponse finale textuelle de l'IA dans SQL
    await sauvegarderMessage(idSession, 'assistant', texteReponse);

    return texteReponse;
}

module.exports = { discuterAvecIA };