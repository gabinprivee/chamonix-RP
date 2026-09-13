const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('identity-config')
    .setDescription("Configurer le salon où les fiches d'identité Discord/Roblox sont postées")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o
        .setName('salon')
        .setDescription('Salon où les membres postent leur fiche (PS Discord / @ Discord / PS Roblox / @ Roblox)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.identity.channelId = interaction.options.getChannel('salon').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        '✅ Salon configuré. Tout message respectant le format sera capturé automatiquement (visible ensuite sur le site web).',
      ephemeral: true
    });
  }
};
