const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load } = require('../storage');
const { performBackup } = require('../handlers/backupHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-now')
    .setDescription('Créer une sauvegarde du serveur immédiatement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const data = load(interaction.guild.id);
    const snapshot = await performBackup(interaction.guild, data.config.backup.channelId);
    await interaction.editReply({
      content: `✅ Sauvegarde créée : ${snapshot.roles.length} rôle(s), ${snapshot.channels.length} salon(s).${
        data.config.backup.channelId ? '' : ' ⚠️ Aucun salon de sauvegarde configuré (voir /backup-config) — elle reste uniquement locale.'
      }`
    });
  }
};
