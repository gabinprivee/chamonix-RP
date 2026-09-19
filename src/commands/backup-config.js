const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup-config')
    .setDescription('Configurer le salon où les sauvegardes automatiques du serveur sont envoyées')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o =>
      o
        .setName('salon')
        .setDescription('Salon privé où les fichiers de sauvegarde seront postés toutes les 6h')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.backup.channelId = interaction.options.getChannel('salon').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        '✅ Salon de sauvegarde configuré. Une sauvegarde automatique sera envoyée toutes les 6 heures. Utilise `/backup-now` pour en faire une immédiatement.',
      ephemeral: true
    });
  }
};
