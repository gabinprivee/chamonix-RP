const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { load, save } = require('../storage');
const { hasRoleAtOrAbove } = require('../permissions');
const { randomUUID } = require('crypto');

function parseDate(str) {
  const parts = str.split('/').map(Number);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

async function openDeclareModal(interaction) {
  const modal = new ModalBuilder().setCustomId('absence_modal').setTitle('Déclarer une absence');
  const dep = new TextInputBuilder()
    .setCustomId('date_depart')
    .setLabel('Date de départ (jj/mm/aaaa)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const ret = new TextInputBuilder()
    .setCustomId('date_retour')
    .setLabel('Date de retour (jj/mm/aaaa)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const raison = new TextInputBuilder()
    .setCustomId('raison')
    .setLabel('Raison')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(
    new ActionRowBuilder().addComponents(dep),
    new ActionRowBuilder().addComponents(ret),
    new ActionRowBuilder().addComponents(raison)
  );
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const data = load(interaction.guild.id);
  const depStr = interaction.fields.getTextInputValue('date_depart');
  const retStr = interaction.fields.getTextInputValue('date_retour');
  const raison = interaction.fields.getTextInputValue('raison');
  const dep = parseDate(depStr);
  const ret = parseDate(retStr);

  if (!dep || !ret || ret < dep) {
    return interaction.reply({
      content: '⚠️ Dates invalides. Format attendu : jj/mm/aaaa, avec une date de retour après la date de départ.',
      ephemeral: true
    });
  }

  const durationDays = Math.ceil((ret - dep) / (1000 * 60 * 60 * 24)) + 1;
  const id = randomUUID();
  data.absences[id] = {
    userId: interaction.user.id,
    start: depStr,
    end: retStr,
    reason: raison,
    durationDays,
    status: 'pending'
  };
  save(interaction.guild.id, data);

  const { validationChannel } = data.config.absence;
  if (!validationChannel) {
    return interaction.reply({ content: "⚠️ Le salon de validation n'est pas configuré (voir /absence-config).", ephemeral: true });
  }
  const channel = await interaction.guild.channels.fetch(validationChannel).catch(() => null);
  if (!channel) {
    return interaction.reply({ content: '⚠️ Le salon de validation est introuvable.', ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setTitle("📝 Déclaration d'absence")
    .addFields(
      { name: 'Membre', value: `<@${interaction.user.id}>` },
      { name: 'Date de départ', value: depStr, inline: true },
      { name: 'Date de retour', value: retStr, inline: true },
      { name: 'Durée', value: `${durationDays} jour(s)`, inline: true },
      { name: 'Raison', value: raison },
      { name: 'Statut', value: '⏳ En attente' }
    )
    .setColor(0xf5a623);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`absence_accept_${id}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`absence_refuse_${id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Ta demande a été envoyée pour validation.', ephemeral: true });
}

async function handleDecision(interaction, id, accepted) {
  const data = load(interaction.guild.id);
  const absence = data.absences[id];
  if (!absence) return interaction.reply({ content: '⚠️ Demande introuvable (peut-être supprimée).', ephemeral: true });

  if (!hasRoleAtOrAbove(interaction.member, data.config.absence.approverRole)) {
    return interaction.reply({ content: "⛔ Tu n'as pas la permission de traiter cette demande.", ephemeral: true });
  }
  if (absence.status !== 'pending') {
    return interaction.reply({ content: 'Cette demande a déjà été traitée.', ephemeral: true });
  }

  absence.status = accepted ? 'accepted' : 'refused';
  absence.treatedBy = interaction.user.id;

  let roleMention = '—';
  if (accepted) {
    const tier = data.config.absence.tiers.find(t => absence.durationDays <= t.maxDays);
    if (tier) {
      const member = await interaction.guild.members.fetch(absence.userId).catch(() => null);
      if (member) {
        await member.roles.add(tier.roleId).catch(() => {});
        absence.roleId = tier.roleId;
      }
      roleMention = `<@&${tier.roleId}>`;
    }
  }
  save(interaction.guild.id, data);

  const oldEmbed = interaction.message.embeds[0];
  const otherFields = oldEmbed.fields.filter(f => f.name !== 'Statut' && f.name !== 'Traité par');
  const embed = EmbedBuilder.from(oldEmbed)
    .setFields(
      ...otherFields,
      { name: 'Statut', value: accepted ? `✅ Acceptée — rôle ${roleMention}` : '❌ Refusée' },
      { name: 'Traité par', value: `<@${interaction.user.id}>` }
    )
    .setColor(accepted ? 0x2ecc71 : 0xe74c3c);

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { openDeclareModal, handleModalSubmit, handleDecision };
