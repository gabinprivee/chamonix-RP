const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { load } = require('../storage');
const { randomBytes } = require('crypto');

// Stocke temporairement la sélection multiple entre les étapes (select -> select -> modal)
const pendingSanctions = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function storeSelection(targetIds) {
  const token = randomBytes(4).toString('hex');
  pendingSanctions.set(token, { targetIds, expiresAt: Date.now() + TTL_MS });
  return token;
}

function popSelection(token) {
  const entry = pendingSanctions.get(token);
  pendingSanctions.delete(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.targetIds;
}

async function handleMultiUserSelect(interaction) {
  const data = load(interaction.guild.id);
  const { requiredRole, types } = data.config.sanction;
  if (!requiredRole) {
    return interaction.update({ content: "⚠️ Le système de sanction n'est pas configuré.", components: [] });
  }
  if (!types.length) {
    return interaction.update({ content: '⚠️ Aucun type de sanction configuré. Utilise `/sanction-type`.', components: [] });
  }

  const selectedIds = interaction.values;
  const valid = [];
  const invalid = [];

  for (const userId of selectedIds) {
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (member && member.roles.cache.has(requiredRole)) valid.push(userId);
    else invalid.push(userId);
  }

  if (!valid.length) {
    return interaction.update({
      content: `⚠️ Aucun des membres sélectionnés n'a le rôle <@&${requiredRole}> requis. Sanction annulée.`,
      components: []
    });
  }

  const token = storeSelection(valid);
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`sanction_multi_type_select_${token}`)
    .setPlaceholder('Choisir le type de sanction')
    .addOptions(types.map((t, i) => ({ label: t.name, value: String(i) })));
  const row = new ActionRowBuilder().addComponents(menu);

  const note = invalid.length
    ? `\n⚠️ ${invalid.length} membre(s) ignoré(s) (n'ont pas le rôle requis) : ${invalid.map(id => `<@${id}>`).join(', ')}`
    : '';

  await interaction.update({
    content: `Sanction pour ${valid.map(id => `<@${id}>`).join(', ')} :${note}`,
    components: [row]
  });
}

async function handleMultiTypeSelect(interaction, token) {
  const typeIndex = interaction.values[0];
  const modal = new ModalBuilder()
    .setCustomId(`sanction_multi_reason_modal_${token}_${typeIndex}`)
    .setTitle('Raison de la sanction');
  const input = new TextInputBuilder().setCustomId('raison').setLabel('Raison').setStyle(TextInputStyle.Paragraph).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleMultiReasonSubmit(interaction, token, typeIndex) {
  const targetIds = popSelection(token);
  if (!targetIds) {
    return interaction.reply({ content: '⚠️ Cette sélection a expiré, relance `/sanction`.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const data = load(interaction.guild.id);
  const type = data.config.sanction.types[Number(typeIndex)];
  if (!type) return interaction.editReply({ content: 'Type de sanction introuvable.' });

  const reason = interaction.fields.getTextInputValue('raison');
  const sanctioned = [];
  const failed = [];

  for (const targetId of targetIds) {
    const target = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!target) {
      failed.push(targetId);
      continue;
    }
    if (type.roleId) await target.roles.add(type.roleId).catch(() => {});
    sanctioned.push(target);
  }

  if (sanctioned.length) {
    const embed = new EmbedBuilder()
      .setTitle(sanctioned.length > 1 ? '⚠️ Sanctions multiples' : '⚠️ Sanction')
      .addFields(
        { name: sanctioned.length > 1 ? 'Membres' : 'Membre', value: sanctioned.map(m => `${m}`).join('\n') },
        { name: 'Type', value: type.name },
        { name: 'Raison', value: reason },
        { name: 'Sanctionné par', value: `${interaction.user}` }
      )
      .setColor(0xe74c3c)
      .setTimestamp();

    const logChannel = await interaction.guild.channels.fetch(data.config.sanction.logChannel).catch(() => null);
    if (logChannel) await logChannel.send({ embeds: [embed] });
  }

  const failedNote = failed.length ? ` (${failed.length} introuvable(s), ignoré(s))` : '';
  await interaction.editReply({ content: `✅ Sanction appliquée à ${sanctioned.length} membre(s).${failedNote}` });
}

module.exports = { handleMultiUserSelect, handleMultiTypeSelect, handleMultiReasonSubmit };
