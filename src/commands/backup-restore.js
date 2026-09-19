const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getLatestLocalBackup, restoreFromSnapshot } = require('../handlers/backupHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-restore')
    .setDescription('Recréer les rôles/salons manquants à partir d’une sauvegarde')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addAttachmentOption(o =>
      o
        .setName('fichier')
        .setDescription('Fichier de sauvegarde .json à utiliser (sinon la dernière sauvegarde locale est utilisée)')
        .setRequired(false)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let snapshot;
    const attachment = interaction.options.getAttachment('fichier');

    if (attachment) {
      try {
        const response = await fetch(attachment.url);
        const text = await response.text();
        snapshot = JSON.parse(text);
      } catch (err) {
        return interaction.editReply({ content: '❌ Impossible de lire ce fichier de sauvegarde.' });
      }
    } else {
      snapshot = getLatestLocalBackup(interaction.guild.id);
      if (!snapshot) {
        return interaction.editReply({
          content: '⚠️ Aucune sauvegarde locale trouvée. Utilise `/backup-now` pour en créer une, ou joins un fichier de sauvegarde.'
        });
      }
    }

    const result = await restoreFromSnapshot(interaction.guild, snapshot);
    await interaction.editReply({
      content: `✅ Restauration terminée : ${result.rolesCreated} rôle(s) recréé(s), ${result.channelsCreated} salon(s) recréé(s). (Seuls les éléments manquants, comparés par nom, ont été recréés.)`
    });
  }
};
