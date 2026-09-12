const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('service-config')
    .setDescription('Configurer le système de service')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon pour le panneau de service').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addRoleOption(o => o.setName('role_admin').setDescription('Rôle minimum pour accéder au panneau admin').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.service.channelId = interaction.options.getChannel('salon').id;
    data.config.service.adminRole = interaction.options.getRole('role_admin').id;
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Configuration enregistrée. Utilise `/service-panel` pour poster les boutons.', ephemeral: true });
  }
};
