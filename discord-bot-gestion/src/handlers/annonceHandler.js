const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');
const { hasRoleAtOrAbove } = require('../permissions');

async function openAnnonceModal(interaction) {
  const data = load(interaction.guild.id);
  if (!hasRoleAtOrAbove(interaction.member, data.config.annonce.authorizedRole)) {
    return interaction.reply({ content: "⛔ Tu n'as pas la permission de faire une annonce.", ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId('annonce_modal').setTitle('Nouvelle annonce');
  const titre = new TextInputBuilder().setCustomId('titre').setLabel('Titre').setStyle(TextInputStyle.Short).setRequired(true);
  const contenu = new TextInputBuilder().setCustomId('contenu').setLabel('Contenu').setStyle(TextInputStyle.Paragraph).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(titre), new ActionRowBuilder().addComponents(contenu));
  await interaction.showModal(modal);
}

async function handleAnnonceSubmit(interaction) {
  const data = load(interaction.guild.id);
  if (!data.config.annonce.channelId) {
    return interaction.reply({ content: "⚠️ Le salon d'annonce n'est pas configuré.", ephemeral: true });
  }
  const channel = await interaction.guild.channels.fetch(data.config.annonce.channelId).catch(() => null);
  if (!channel) return interaction.reply({ content: '⚠️ Salon introuvable.', ephemeral: true });

  const titre = interaction.fields.getTextInputValue('titre');
  const contenu = interaction.fields.getTextInputValue('contenu');
  const embed = new EmbedBuilder()
    .setTitle(`📢 ${titre}`)
    .setDescription(contenu)
    .setColor(0x5865f2)
    .setFooter({ text: `Annoncé par ${interaction.user.tag}` })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Annonce publiée.', ephemeral: true });
}

module.exports = { openAnnonceModal, handleAnnonceSubmit };
