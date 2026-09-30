// config/database.js
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'AssistantIALegacy', // Correspond exactement à ton .env
    options: {
        encrypt: false,
        trustServerCertificate: process.env.DB_OPTIONS_TRUST_SERVER_CERTIFICATE === 'true',
    }
};

// Si tu utilises l'authentification Windows (sans user/password dans le .env),
// le package mssql va tenter de se connecter directement avec ta session Windows active.
if (process.env.DB_USER) {
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
}

let poolPromise;

async function connecterDB() {
    try {
        if (!poolPromise) {
            console.log("🔄 Connexion à SQL Server en cours...");
            poolPromise = await sql.connect(config);
            console.log("✅ Connecté avec succès à SQL Server !");
        }
        return poolPromise;
    } catch (err) {
        console.error("❌ Échec de la connexion à la base de données :", err);
        poolPromise = null;
        throw err;
    }
}

module.exports = {
    sql,
    connecterDB
};