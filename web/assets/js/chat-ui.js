// web/assets/js/chat-ui.js

// On génère un ID de session simple (un nombre aléatoire) pour les tests locaux
// Cela permet à SQL Server de regrouper tes messages sous une même discussion
const idSession = Math.floor(Math.random() * 100000);

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

/**
 * Ajoute visuellement une bulle de message dans l'interface
 * Les messages de l'assistant sont accompagnés d'une petite mascotte ronde
 */
function ajouterMessageHTML(role, texte) {
    const row = document.createElement('div');
    row.classList.add('message-row');
    if (role === 'user') {
        row.classList.add('user-row');
    }

    if (role === 'assistant') {
        const mascotte = document.createElement('div');
        mascotte.classList.add('mascot');
        mascotte.setAttribute('aria-hidden', 'true');
        mascotte.innerHTML = `
            <span class="mascot__ear mascot__ear--left"></span>
            <span class="mascot__ear mascot__ear--right"></span>
            <span class="mascot__eye mascot__eye--left"></span>
            <span class="mascot__eye mascot__eye--right"></span>
            <span class="mascot__blush mascot__blush--left"></span>
            <span class="mascot__blush mascot__blush--right"></span>
            <span class="mascot__mouth"></span>
        `;
        row.appendChild(mascotte);
    }

    const bulle = document.createElement('div');
    bulle.classList.add('message', role);
    bulle.innerText = texte;
    row.appendChild(bulle);

    chatBox.appendChild(row);

    // Fait défiler le chat vers le bas automatiquement
    chatBox.scrollTop = chatBox.scrollHeight;
}

/**
 * Fait apparaître un petit coeur qui flotte et disparaît, près du bouton Envoyer
 */
function faireApparaitreCoeur() {
    const coeur = document.createElement('span');
    coeur.classList.add('heart-pop');
    coeur.setAttribute('aria-hidden', 'true');
    coeur.innerText = '♡';

    const rect = sendBtn.getBoundingClientRect();
    coeur.style.left = `${rect.left + rect.width / 2 - 9}px`;
    coeur.style.top = `${rect.top - 6}px`;

    document.body.appendChild(coeur);

    // On retire l'élément une fois l'animation terminée pour ne pas encombrer le DOM
    setTimeout(() => coeur.remove(), 900);
}

/**
 * Envoie le message au serveur back-end
 */
async function envoyerMessage() {
    const message = userInput.value.trim();
    if (!message) return; // On fait rien si le champ est vide

    // 1. Afficher le message de l'utilisateur à l'écran
    ajouterMessageHTML('user', message);
    faireApparaitreCoeur();
    userInput.value = ''; // On vide le champ de texte
    userInput.style.height = 'auto'; // On reprend une hauteur d'une seule ligne

    try {
        // 2. Envoyer la requête POST à notre API Express
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idSession: idSession,
                message: message
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Afficher la réponse de Ollama reçue du serveur 
            ajouterMessageHTML('assistant', data.reponse);
        } else {
            ajouterMessageHTML('assistant', `⚠️ Erreur : ${data.error || 'Impossible de joindre le serveur.'}`);
        }

    } catch (erreur) {
        console.error("Erreur de communication :", erreur);
        ajouterMessageHTML('assistant', "❌ Erreur réseau : Impossible de contacter le serveur d'IA.");
    }
}

// Écouter le clic sur le bouton Envoyer
sendBtn.addEventListener('click', envoyerMessage);

// Permettre d'envoyer avec la touche "Entrée" (Maj+Entrée fait un saut de ligne, comme la plupart des apps de chat)
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        envoyerMessage();
    }
});

// Agrandit automatiquement la zone de texte quand on colle du code sur plusieurs lignes
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${userInput.scrollHeight}px`;
});