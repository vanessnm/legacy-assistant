// src/app.js
require('dotenv').config(); // Va chercher tes variables cachées dans le fichier .env
const express = require('express');
const path = require('path');
const { connecterDB } = require('../config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares obligatoires pour comprendre le texte et le JSON envoyé par le front-end
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dit à Express de servir tes fichiers HTML/CSS/JS qui seront dans le dossier 'web'
app.use(express.static(path.join(__dirname, '../web')));

// Route de test pour s'assurer que le serveur répond bien
app.get('/api/statut', (req, res) => {
    res.json({ message: "Le serveur Express de Vanessa fonctionne à merveille !" });
});

// Fonction pour démarrer proprement la DB puis le serveur
// On importe la route du chat
const routeChat = require('./routes/chat');
// On dit à Express d'utiliser cette route avec le préfixe /api
app.use('/api', routeChat);

async function demarrerServeur() {
    try {
        // On teste la connexion SQL Server au démarrage
        await connecterDB();
        
        app.listen(PORT, () => {
            console.log(`==================================================`);
            console.log(`🚀 Serveur actif : http://localhost:${PORT}`);
            console.log(`==================================================`);
        });
    } catch (erreur) {
        console.error("❌ Impossible de démarrer le serveur : panne SQL Server.", erreur);
    }
}

demarrerServeur();