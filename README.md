# Legacy Assistant

Assistant IA local conçu pour l’analyse de code et l’intégration d’outils externes à l’aide du protocole MCP.

Legacy Assistant combine une interface Web avec **Ollama**, **Node.js / Express**, **Python**, **MCP** et **SQL Server**. L’application permet de converser avec un modèle d’intelligence artificielle local et d’utiliser un outil Python pour analyser du code source.

## Aperçu

![Legacy Assistant](assets/Capture-legacy-assistant.png)

## Fonctionnalités

- Assistant conversationnel utilisant un modèle IA local avec Ollama
- Analyse de code source avec un outil Python
- Intégration d’outils via MCP (Model Context Protocol)
- Détection de métriques de code :
  - nombre de lignes
  - nombre de fonctions
  - lignes trop longues
  - TODO / FIXME
  - score et niveau de complexité
- Historique des conversations enregistré dans SQL Server
- Interface Web responsive
- Fonctionnement entièrement local

## Technologies utilisées

- HTML
- CSS
- JavaScript
- Node.js
- Express
- Python
- SQL Server
- Ollama
- Llama 3.1 8B
- Model Context Protocol (MCP)

## Démonstration

La démonstration montre le démarrage de l’application, une interaction avec l’assistant IA ainsi qu’une analyse de code réalisée à l’aide de l’outil Python connecté via MCP.

[▶ Voir la vidéo de démonstration](assets/Assistant_Legacy_Demo.mp4)

## Fonctionnement

```text
Interface Web
     │
     ▼
Node.js / Express
     │
     ├── SQL Server
     │     └── Historique des conversations
     │
     ▼
Ollama — Llama 3.1 8B
     │
     ▼
Client MCP
     │
     ▼
Serveur MCP
     │
     ▼
Outil Python d'analyse de code
```

Lorsqu’une analyse de code est demandée, l’assistant peut appeler l’outil `analyser_code_legacy` exposé par le serveur MCP. Celui-ci exécute le script Python d’analyse et retourne les métriques au modèle IA, qui présente ensuite les résultats à l’utilisateur.

## Exécution locale

### Prérequis

- Node.js
- Python
- SQL Server
- Ollama
- Modèle `llama3.1:8b`

### Installation

Installer les dépendances :

```bash
npm install
```

Configurer les informations de connexion à SQL Server dans un fichier `.env` local.

> Le fichier `.env` contenant les informations de connexion n’est pas inclus dans le dépôt.

Démarrer Ollama et s’assurer que le modèle `llama3.1:8b` est disponible.

Démarrer ensuite l’application :

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Confidentialité

L’application utilise une IA exécutée localement avec Ollama. Les informations sensibles de connexion à la base de données sont conservées dans un fichier `.env` exclu du dépôt Git.

## Auteur

**Vanessa Noël-Marchand**

Projet réalisé dans le cadre de l’AEC **Développement Web en contexte d’intelligence artificielle** au Cégep de Saint-Félicien.