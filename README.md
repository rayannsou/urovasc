# urovasc
## Rappels (notifications push)

Le code est en place (réglages dans l'appli, `firebase-messaging-sw.js`, fonction planifiée dans `functions/`). Il reste 3 étapes, une seule fois, dans la console Firebase du projet **planning-uro** :

1. **Clé Web Push** : Paramètres du projet → Cloud Messaging → « Certificats Web Push » → Générer une paire de clés. Copier la clé publique dans un fichier `vapid.txt` à côté de `build_site.py`, puis reconstruire le site.
2. **Forfait Blaze** (paiement à l'usage, gratuit à cette échelle) : nécessaire pour déployer la fonction planifiée.
3. **Déployer la fonction** : `cd functions && npm install && cd .. && firebase deploy --only functions`.

Règles Firestore : la collection `push` doit être lisible et modifiable comme `echanges`.
Sur iPhone : ajouter l'appli à l'écran d'accueil (Partager → Sur l'écran d'accueil), l'ouvrir depuis l'icône, puis Réglages → Rappels → Activer.

## Interfaces

Mots de passe (hachés dans la page) : `interne` (interface Internes), `grenier` (interface Seniors), et l'ancien code du service (Seniors). Chaque interface ne crée et n'importe que les personnes de son groupe (fonction « Interne » = internes, les autres = seniors) ; les affichages montrent tout le monde.
