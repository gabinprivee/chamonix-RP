const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avis-config')
    .setDescription("Configurer le système d'avis")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où poster les avis').addChannelTypes(ChannelType.GuildText).setRequired(true)
    ),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.avis.channelId = interaction.options.getChannel('salon').id;
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Configuré. Utilise `/avis-panel` pour poster le bouton.', ephemeral: true });
  }
};
