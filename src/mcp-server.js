// src/mcp-server.js

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const {
    ListToolsRequestSchema,
    CallToolRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const { execFile } = require('child_process');
const path = require('path');


// 1. Initialisation du serveur avec l'identité de notre connecteur
const server = new Server(
    {
        name: "assistant-ia-mcp-connecteur",
        version: "1.0.0"
    },
    {
        capabilities: {
            tools: {}
        }
    }
);


// 2. Déclaration de la liste des outils disponibles (Le Contrat)
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [

            // Outil existant : analyse de code legacy
            {
                name: "analyser_code_legacy",

                description:
                    "Analyse un extrait de code source (COBOL, JS, Python, etc.) et retourne des métriques utiles : nombre de lignes, nombre de fonctions, lignes trop longues, dette technique (TODO/FIXME), et un score de complexité approximatif.",

                inputSchema: {
                    type: "object",

                    properties: {
                        code: {
                            type: "string",
                            description: "Le texte brut du code à analyser"
                        }
                    },

                    required: ["code"]
                }
            },


            // TP2 : outil calculer_total
            {
                name: "calculer_total",

                description:
                    "Permet de multiplier un prix par une quantité",

                inputSchema: {
                    type: "object",

                    properties: {
                        prix: {
                            type: "number",
                            description: "Le prix unitaire"
                        },

                        quantite: {
                            type: "number",
                            description: "La quantité"
                        }
                    },

                    required: ["prix", "quantite"]
                }
            }
        ]
    };
});


// 3. Exécution de la logique des outils (La Logique)
server.setRequestHandler(CallToolRequestSchema, async (request) => {

    const {
        name,
        arguments: args
    } = request.params;


    // Outil existant : analyser le code legacy
    if (name === "analyser_code_legacy") {

        return new Promise((resolve) => {

            const cheminPython = path.join(
                __dirname,
                '../scripts/code_analyzer.py'
            );

            // execFile passe args.code comme UN argument distinct
            // (pas de shell entre les deux).
            // Les retours à la ligne, guillemets, etc. arrivent intacts à Python.
            execFile(
                'python',
                [cheminPython, args.code],
                (error, stdout, stderr) => {

                    if (error) {
                        return resolve({
                            content: [
                                {
                                    type: "text",
                                    text: `Erreur Python : ${stderr || error.message}`
                                }
                            ],
                            isError: true
                        });
                    }

                    resolve({
                        content: [
                            {
                                type: "text",
                                text: stdout
                            }
                        ]
                    });
                }
            );
        });
    }


    // TP2 : outil calculer_total
    if (name === "calculer_total") {

        const prix = args.prix;
        const quantite = args.quantite;

        const total = prix * quantite;

        return {
            content: [
                {
                    type: "text",
                    text: `Le total est de ${total}`
                }
            ]
        };
    }


    // Aucun outil correspondant
    throw new Error(`Outil introuvable : ${name}`);
});


// 4. Démarrage du serveur sur le canal de transport standard stdio
async function demarrer() {

    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.error(
        "[MCP] Serveur de connecteurs en ligne via stdio (outils : analyser_code_legacy, calculer_total)"
    );
}

demarrer();