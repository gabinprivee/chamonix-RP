const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avis-panel')
    .setDescription("Poster le panneau d'avis dans ce salon")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    if (!data.config.avis.channelId) return interaction.reply({ content: "⚠️ Configure d'abord `/avis-config`.", ephemeral: true });

    const embed = new EmbedBuilder().setTitle('⭐ Avis').setDescription('Clique ci-dessous pour laisser un avis.').setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('avis_open').setLabel('Laisser un avis').setStyle(ButtonStyle.Primary)
    );
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panneau posté.', ephemeral: true });
  }
};
