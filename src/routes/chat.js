// src/routes/chat.js
const express = require('express');
const router = express.Router();
const { discuterAvecIA } = require('../api-agent');

/**
 * Route POST qui gère l'envoi d'un message depuis l'interface web
 * URL : http://localhost:3000/api/chat
 */
router.post('/chat', async (req, res) => {
    const { idSession, message } = req.body;

    // Petite validation de sécurité pour ne pas envoyer de message vide à Claude
    if (!message || !idSession) {
        return res.status(400).json({ error: "L'identifiant de session et le message sont obligatoires." });
    }

    try {
        // On passe le relais à notre agent IA qui gère la mémoire SQL et l'appel LLM
        const reponseClaude = await discuterAvecIA(Number(idSession), message);
        
        // On retourne la réponse finale au front-end
        res.json({ reponse: reponseClaude });
    } catch (erreur) {
        console.error("❌ Erreur sur la route /api/chat :", erreur);
        res.status(500).json({ error: "Une erreur est survenue lors de la communication avec l'assistant." });
    }
});

module.exports = router;