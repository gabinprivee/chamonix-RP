const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sanction-config')
    .setDescription('Configurer le système de sanction')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(o => o.setName('role_requis').setDescription('Rôle que doit avoir la personne pour être sanctionnable').setRequired(true))
    .addChannelOption(o =>
      o.setName('salon_log').setDescription('Salon où poster les sanctions').addChannelTypes(ChannelType.GuildText).setRequired(true)
    ),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.sanction.requiredRole = interaction.options.getRole('role_requis').id;
    data.config.sanction.logChannel = interaction.options.getChannel('salon_log').id;
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Configuré. Utilise `/sanction-type` pour ajouter des types de sanction.', ephemeral: true });
  }
};
