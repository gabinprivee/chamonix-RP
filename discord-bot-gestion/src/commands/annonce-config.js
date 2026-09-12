const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('annonce-config')
    .setDescription("Configurer le système d'annonce")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où arrivent les annonces').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addRoleOption(o => o.setName('role_autorise').setDescription('Rôle minimum pour faire une annonce').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.annonce.channelId = interaction.options.getChannel('salon').id;
    data.config.annonce.authorizedRole = interaction.options.getRole('role_autorise').id;
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Configuré. Utilise `/annonce-panel` pour poster le bouton.', ephemeral: true });
  }
};
