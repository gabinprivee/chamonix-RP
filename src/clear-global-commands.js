require('dotenv').config();
const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Suppression des commandes globales...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('✅ Commandes globales supprimées. Relance "npm run deploy" pour ne garder que les commandes du serveur.');
  } catch (err) {
    console.error('❌ Erreur :', err);
  }
})();
