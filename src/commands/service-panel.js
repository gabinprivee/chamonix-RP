const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('service-panel')
    .setDescription('Poster le panneau de service (commencer / pause / arrêter)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const { channelId } = data.config.service;
    if (!channelId) return interaction.reply({ content: "⚠️ Configure d'abord `/service-config`.", ephemeral: true });
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return interaction.reply({ content: '⚠️ Salon introuvable.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🕒 Service')
      .setDescription('Utilise les boutons ci-dessous pour gérer ton temps de service.')
      .setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('service_start').setLabel('Commencer').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('service_pause').setLabel('Pause').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('service_stop').setLabel('Arrêter').setStyle(ButtonStyle.Danger)
    );
    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panneau posté.', ephemeral: true });
  }
};
