const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('annonce-panel')
    .setDescription("Poster le bouton d'annonce dans ce salon")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    if (!data.config.annonce.channelId) return interaction.reply({ content: "⚠️ Configure d'abord `/annonce-config`.", ephemeral: true });

    const embed = new EmbedBuilder().setTitle('📢 Annonce').setDescription('Clique ci-dessous pour rédiger une annonce.').setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('annonce_open').setLabel('Faire une annonce').setStyle(ButtonStyle.Primary)
    );
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Bouton posté.', ephemeral: true });
  }
};
