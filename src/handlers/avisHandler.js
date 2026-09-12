const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

async function openAvisModal(interaction) {
  const modal = new ModalBuilder().setCustomId('avis_modal').setTitle('Laisser un avis');
  const note = new TextInputBuilder().setCustomId('note').setLabel('Note sur 5').setStyle(TextInputStyle.Short).setRequired(true);
  const commentaire = new TextInputBuilder()
    .setCustomId('commentaire')
    .setLabel('Commentaire')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(note), new ActionRowBuilder().addComponents(commentaire));
  await interaction.showModal(modal);
}

async function handleAvisSubmit(interaction) {
  const data = load(interaction.guild.id);
  if (!data.config.avis.channelId) {
    return interaction.reply({ content: "⚠️ Le salon d'avis n'est pas configuré.", ephemeral: true });
  }
  const channel = await interaction.guild.channels.fetch(data.config.avis.channelId).catch(() => null);
  if (!channel) return interaction.reply({ content: "⚠️ Salon d'avis introuvable.", ephemeral: true });

  const note = interaction.fields.getTextInputValue('note');
  const commentaire = interaction.fields.getTextInputValue('commentaire');
  const embed = new EmbedBuilder()
    .setTitle('⭐ Nouvel avis')
    .addFields(
      { name: 'Membre', value: `${interaction.user}` },
      { name: 'Note', value: `${note}/5` },
      { name: 'Commentaire', value: commentaire }
    )
    .setColor(0xf1c40f)
    .setTimestamp();

  await channel.send({ embeds: [embed] });
  await interaction.reply({ content: '✅ Merci pour ton avis !', ephemeral: true });
}

module.exports = { openAvisModal, handleAvisSubmit };
