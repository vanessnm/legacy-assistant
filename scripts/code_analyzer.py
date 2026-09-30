# scripts/code_analyzer.py
import sys
import json
import re

def analyser_code(code_a_tester):
    """
    Analyse un extrait de code et retourne des métriques simples mais utiles :
    - nombre de lignes de code réel (sans lignes vides)
    - nombre de fonctions détectées (JS, Python, ou autres langages courants)
    - lignes trop longues (+100 caractères)
    - commentaires TODO / FIXME (dette technique)
    - score de complexité approximatif (compte les structures de contrôle)
    """
    lignes = code_a_tester.splitlines()
    nb_lignes_total = len(lignes)

    # On ignore les lignes vides pour compter le "vrai" code
    lignes_non_vides = [l for l in lignes if l.strip() != ""]
    nb_lignes_code = len(lignes_non_vides)

    # Détection de fonctions : couvre "function nom(", "def nom(", et les flèches "nom = (...) =>"
    motif_fonctions = re.compile(r'\b(function\s+\w+\s*\(|def\s+\w+\s*\(|\w+\s*=\s*\([^)]*\)\s*=>)')
    nb_fonctions = len(motif_fonctions.findall(code_a_tester))

    # Lignes trop longues : mauvaise pratique de lisibilité (seuil courant : 100 caractères)
    lignes_trop_longues = [i + 1 for i, l in enumerate(lignes) if len(l) > 100]

    # Dette technique : commentaires TODO ou FIXME laissés dans le code
    motif_dette = re.compile(r'(TODO|FIXME)', re.IGNORECASE)
    lignes_dette = [i + 1 for i, l in enumerate(lignes) if motif_dette.search(l)]

    # Score de complexité approximatif : on compte les structures de contrôle
    # Plus il y en a, plus le code a de chemins possibles à suivre pour un humain (ou une IA)
    motif_complexite = re.compile(r'\b(if|for|while|switch|case|elif|except|catch)\b')
    score_complexite = len(motif_complexite.findall(code_a_tester))

    # Interprétation simple du score pour rendre le rapport lisible
    if score_complexite <= 3:
        niveau_complexite = "faible"
    elif score_complexite <= 8:
        niveau_complexite = "modérée"
    else:
        niveau_complexite = "élevée"

    resultat = {
        "statut": "Succès",
        "nb_lignes_total": nb_lignes_total,
        "nb_lignes_code": nb_lignes_code,
        "nb_fonctions_detectees": nb_fonctions,
        "lignes_trop_longues": lignes_trop_longues,
        "lignes_dette_technique": lignes_dette,
        "score_complexite": score_complexite,
        "niveau_complexite": niveau_complexite
    }

    return resultat

if __name__ == "__main__":
    # Ce bloc permet à Node.js de passer des arguments à notre script Python
    if len(sys.argv) > 1:
        donnees_entree = sys.argv[1]
        compte_rendu = analyser_code(donnees_entree)
        # On renvoie le résultat sous forme de texte JSON pour que Node.js puisse le lire
        print(json.dumps(compte_rendu, ensure_ascii=True))
    else:
        print(json.dumps({"erreur": "Aucun code n'a été fourni à Python"}))