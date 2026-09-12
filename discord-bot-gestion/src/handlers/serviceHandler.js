const {
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { load, save } = require('../storage');

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}

function getSession(data, userId) {
  if (!data.service[userId]) {
    data.service[userId] = { status: 'stopped', startedAt: null, totalSeconds: 0 };
  }
  return data.service[userId];
}

async function handleStart(interaction) {
  const data = load(interaction.guild.id);
  const s = getSession(data, interaction.user.id);
  if (s.status === 'running') {
    return interaction.reply({ content: 'Ton service est déjà en cours.', ephemeral: true });
  }
  s.status = 'running';
  s.startedAt = Date.now();
  save(interaction.guild.id, data);
  await interaction.reply({ content: '✅ Service commencé.', ephemeral: true });
}

async function handlePause(interaction) {
  const data = load(interaction.guild.id);
  const s = getSession(data, interaction.user.id);
  if (s.status !== 'running') {
    return interaction.reply({ content: "Tu n'es pas actuellement en service.", ephemeral: true });
  }
  s.totalSeconds += Math.floor((Date.now() - s.startedAt) / 1000);
  s.status = 'paused';
  s.startedAt = null;
  save(interaction.guild.id, data);
  await interaction.reply({ content: `⏸️ Service en pause. Temps cumulé : ${fmt(s.totalSeconds)}.`, ephemeral: true });
}

async function handleStop(interaction) {
  const data = load(interaction.guild.id);
  const s = getSession(data, interaction.user.id);
  if (s.status === 'running') {
    s.totalSeconds += Math.floor((Date.now() - s.startedAt) / 1000);
  }
  s.status = 'stopped';
  s.startedAt = null;
  save(interaction.guild.id, data);
  await interaction.reply({ content: `⏹️ Service terminé. Temps total : ${fmt(s.totalSeconds)}.`, ephemeral: true });
}

async function handleAdminForceStopSelect(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('service_admin_forcestop_select').setPlaceholder('Choisir un membre').setMinValues(1).setMaxValues(1)
  );
  await interaction.reply({ content: 'Sélectionne le membre dont tu veux forcer la fin de service :', components: [row], ephemeral: true });
}

async function handleAdminForceStopResolve(interaction) {
  const data = load(interaction.guild.id);
  const userId = interaction.values[0];
  const s = getSession(data, userId);
  if (s.status === 'running') s.totalSeconds += Math.floor((Date.now() - s.startedAt) / 1000);
  s.status = 'stopped';
  s.startedAt = null;
  save(interaction.guild.id, data);
  await interaction.update({ content: `✅ Service de <@${userId}> arrêté de force. Temps total : ${fmt(s.totalSeconds)}.`, components: [] });
}

async function handleAdminAddSelect(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('service_admin_add_select').setPlaceholder('Choisir un membre').setMinValues(1).setMaxValues(1)
  );
  await interaction.reply({ content: 'Sélectionne le membre à qui ajouter des heures :', components: [row], ephemeral: true });
}

async function handleAdminRemoveSelect(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId('service_admin_remove_select').setPlaceholder('Choisir un membre').setMinValues(1).setMaxValues(1)
  );
  await interaction.reply({ content: 'Sélectionne le membre à qui retirer des heures :', components: [row], ephemeral: true });
}

async function handleAdminAddResolve(interaction) {
  const userId = interaction.values[0];
  const modal = new ModalBuilder().setCustomId(`service_admin_add_modal_${userId}`).setTitle('Ajouter des heures');
  const input = new TextInputBuilder().setCustomId('heures').setLabel("Nombre d'heures à ajouter").setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleAdminRemoveResolve(interaction) {
  const userId = interaction.values[0];
  const modal = new ModalBuilder().setCustomId(`service_admin_remove_modal_${userId}`).setTitle('Retirer des heures');
  const input = new TextInputBuilder().setCustomId('heures').setLabel("Nombre d'heures à retirer").setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleAdminAddModalSubmit(interaction, userId) {
  const data = load(interaction.guild.id);
  const hours = parseFloat(interaction.fields.getTextInputValue('heures').replace(',', '.'));
  if (isNaN(hours)) return interaction.reply({ content: 'Valeur invalide.', ephemeral: true });
  const s = getSession(data, userId);
  s.totalSeconds += Math.round(hours * 3600);
  save(interaction.guild.id, data);
  await interaction.reply({ content: `✅ ${hours}h ajoutées à <@${userId}>. Nouveau total : ${fmt(s.totalSeconds)}.`, ephemeral: true });
}

async function handleAdminRemoveModalSubmit(interaction, userId) {
  const data = load(interaction.guild.id);
  const hours = parseFloat(interaction.fields.getTextInputValue('heures').replace(',', '.'));
  if (isNaN(hours)) return interaction.reply({ content: 'Valeur invalide.', ephemeral: true });
  const s = getSession(data, userId);
  s.totalSeconds = Math.max(0, s.totalSeconds - Math.round(hours * 3600));
  save(interaction.guild.id, data);
  await interaction.reply({ content: `✅ ${hours}h retirées à <@${userId}>. Nouveau total : ${fmt(s.totalSeconds)}.`, ephemeral: true });
}

async function handleAdminView(interaction) {
  const data = load(interaction.guild.id);
  const entries = Object.entries(data.service);
  if (!entries.length) return interaction.reply({ content: 'Aucune donnée de service pour le moment.', ephemeral: true });
  const lines = entries.map(([userId, s]) => {
    let total = s.totalSeconds;
    if (s.status === 'running') total += Math.floor((Date.now() - s.startedAt) / 1000);
    const statusLabel = s.status === 'running' ? '🟢 En service' : s.status === 'paused' ? '🟡 En pause' : '⚪ Arrêté';
    return `<@${userId}> — ${fmt(total)} — ${statusLabel}`;
  });
  await interaction.reply({ content: lines.join('\n'), ephemeral: true });
}

module.exports = {
  handleStart,
  handlePause,
  handleStop,
  handleAdminForceStopSelect,
  handleAdminForceStopResolve,
  handleAdminAddSelect,
  handleAdminRemoveSelect,
  handleAdminAddResolve,
  handleAdminRemoveResolve,
  handleAdminAddModalSubmit,
  handleAdminRemoveModalSubmit,
  handleAdminView
};
