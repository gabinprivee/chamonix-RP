# Bot Discord de gestion

Bot complet avec : absences, rôle-réaction, rankup, service (shifts), sanctions, avis, annonces.

## 1. Installation

```bash
npm install
cp .env.example .env
```

Remplis `.env` :
- `DISCORD_TOKEN` : token du bot (Discord Developer Portal > ton appli > Bot > Reset Token)
- `CLIENT_ID` : ID de l'application (Developer Portal > General Information > Application ID)
- `GUILD_ID` : (optionnel) ID de ton serveur, pour que les commandes slash apparaissent instantanément pendant les tests. Sans ça, elles mettent jusqu'à 1h à se propager globalement.

Invite le bot avec les scopes `bot` + `applications.commands` et au minimum les permissions : Gérer les rôles, Envoyer des messages, Intégrer des liens, Utiliser les commandes slash, Ajouter des réactions, Lire l'historique des messages.

**Important** : dans le Developer Portal > Bot, active l'intent **Server Members Intent** (nécessaire pour attribuer des rôles) et **Message Content Intent**.

**Important aussi** : le rôle du bot doit être placé **au-dessus** de tous les rôles qu'il doit attribuer/retirer (absences, rankup, sanctions, rôle-réaction), sinon Discord refusera l'action.

## 2. Lancer le bot

```bash
npm run deploy   # déploie les commandes slash (à refaire à chaque ajout/modif de commande)
npm start        # démarre le bot
```

## 3. Guide de configuration par système

Toutes les commandes `*-config` nécessitent la permission "Gérer le serveur".

### 📝 Absences
1. `/absence-config salon_demande:<#salon> salon_validation:<#salon> role_validateur:<@role>`
   → `role_validateur` = rôle minimum pour accepter/refuser (tout rôle de position égale ou supérieure fonctionne).
2. `/absence-tier jours_max:<n> role:<@role>` — répéter pour chaque palier, ex :
   - 7 jours max → rôle "Absence courte"
   - 15 jours max → rôle "Absence moyenne"
   - 30 jours max → rôle "Absence longue"
3. `/absence-panel` dans le salon de demande → poste le bouton "Déclarer une absence".

Fonctionnement : un membre clique le bouton → renseigne date de départ, date de retour, raison → la demande arrive dans le salon de validation avec boutons Accepter/Refuser. Si acceptée, le rôle correspondant à la durée est attribué automatiquement, et il est retiré automatiquement (vérification toutes les heures) une fois la date de retour dépassée.

### 🎭 Rôle-réaction
`/reactionrole-setup salon:<#salon> titre:<texte> description:<texte> emoji:<😀> role:<@role> [role_exclu:<@role>] [lien:<url>]`

- Réagir avec l'emoji donne le rôle.
- Si `role_exclu` est renseigné (ex: le rôle Staff), une personne qui a déjà ce rôle ne reçoit pas le rôle en réagissant : elle reçoit `lien` en message privé à la place. C'est l'interprétation retenue pour "Axel qui est staff n'a pas le rôle en réagissant" — dis-moi si ce n'est pas le comportement voulu, je peux l'ajuster.

### ⬆️ Rankup
1. `/rankup-config role_minimum:<@role>` — rôle minimum requis pour promouvoir quelqu'un.
2. `/rankup-ladder ajouter role:<@role>` — à répéter dans l'ordre, du grade le plus bas au plus haut (ex: Recrue → Modérateur Test → Modérateur → Modérateur Confirmé...).
3. `/rankup-ladder voir` pour vérifier l'ordre.
4. `/rankup membre:<@membre>` — retire le grade actuel du membre et lui donne le grade juste au-dessus dans la hiérarchie. S'il n'a aucun grade, il reçoit le premier de la liste.

### 🕒 Service
1. `/service-config salon:<#salon> role_admin:<@role>` — `role_admin` = rôle minimum pour accéder au panneau admin.
2. `/service-panel` dans le salon → poste les 3 boutons Commencer / Pause / Arrêter (utilisables par tout le monde).
3. `/service-admin` (réservé au rôle admin configuré) → ouvre un panneau éphémère avec :
   - **Forcer la fin de service** (sélection d'un membre)
   - **Ajouter des heures** (sélection d'un membre + saisie du nombre d'heures)
   - **Retirer des heures** (idem)
   - **Voir les heures** de tout le monde, avec statut en cours/pause/arrêté

### ⚠️ Sanctions
1. `/sanction-config role_requis:<@role> salon_log:<#salon>` — `role_requis` = rôle que doit avoir la cible (ex: le rôle "SDC") pour être sanctionnable via cette commande.
2. `/sanction-type nom:<texte> [role:<@role>]` — à répéter pour chaque type (Avertissement, Mise à pied, etc.), avec un rôle optionnel attribué automatiquement lors de la sanction.
3. `/sanction membre:<@membre>` — vérifie que la cible a le rôle requis, propose la liste des types de sanction, puis demande la raison. La sanction est postée dans le salon de log configuré.

### ⭐ Avis
1. `/avis-config salon:<#salon>`
2. `/avis-panel` dans un salon → poste le bouton "Laisser un avis". N'importe qui peut cliquer, renseigner une note sur 5 et un commentaire.

### 📢 Annonces
1. `/annonce-config salon:<#salon> role_autorise:<@role>`
2. `/annonce-panel` dans un salon → poste le bouton "Faire une annonce". Seules les personnes ayant un rôle de position égale ou supérieure à `role_autorise` peuvent l'utiliser ; elles renseignent titre + contenu, publiés dans le salon configuré.

## 4. Structure du projet

```
src/
  index.js              point d'entrée
  deploy-commands.js    déploiement des commandes slash
  scheduler.js          expiration automatique des absences
  storage.js            stockage JSON par serveur (data/<guildId>.json)
  permissions.js        vérification "rôle X ou au-dessus"
  commands/             une commande slash par fichier
  events/                ready, interactionCreate, réactions
  handlers/              logique métier de chaque système
data/                    fichiers de données générés automatiquement (ignorés par git)
```

## 5. Limitations connues / à personnaliser

- Le stockage est en fichiers JSON (simple, pas besoin de base de données externe). Pour un très gros serveur avec beaucoup d'historique, on peut migrer vers SQLite plus tard.
- Les dates d'absence doivent être saisies au format `jj/mm/aaaa`.
- Si tu veux que les boutons de service ou d'avis ne soient utilisables que par certains rôles, dis-le-moi, ce n'était pas précisé donc j'ai laissé accès à tout le monde.
