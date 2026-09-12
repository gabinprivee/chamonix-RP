const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

async function handleTypeSelect(interaction, targetId) {
  const typeIndex = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`sanction_reason_modal_${targetId}_${typeIndex}`)
    .setTitle('Raison de la sanction');
  const input = new TextInputBuilder().setCustomId('raison').setLabel('Raison').setStyle(TextInputStyle.Paragraph).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleReasonSubmit(interaction, targetId, typeIndex) {
  const data = load(interaction.guild.id);
  const type = data.config.sanction.types[Number(typeIndex)];
  if (!type) return interaction.reply({ content: 'Type de sanction introuvable.', ephemeral: true });

  const reason = interaction.fields.getTextInputValue('raison');
  const target = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

  if (type.roleId) await target.roles.add(type.roleId).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('⚠️ Sanction')
    .addFields(
      { name: 'Membre', value: `${target}` },
      { name: 'Type', value: type.name },
      { name: 'Raison', value: reason },
      { name: 'Sanctionné par', value: `${interaction.user}` }
    )
    .setColor(0xe74c3c)
    .setTimestamp();

  const logChannel = await interaction.guild.channels.fetch(data.config.sanction.logChannel).catch(() => null);
  if (logChannel) await logChannel.send({ embeds: [embed] });

  await interaction.reply({ content: `✅ Sanction appliquée à ${target}.`, ephemeral: true });
}

module.exports = { handleTypeSelect, handleReasonSubmit };
