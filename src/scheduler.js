const fs = require('fs');
const path = require('path');
const { load, save } = require('./storage');
const { buildDashboardEmbed } = require('./handlers/serviceDashboard');
const { performBackup } = require('./handlers/backupHandler');
const { checkReminders } = require('./handlers/ticketHandler');

function parseDate(str) {
  const [d, m, y] = str.split('/').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59);
}

async function checkAbsences(client) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return;
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.json')) continue;
    const guildId = file.replace('.json', '');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const data = load(guildId);
    let changed = false;
    for (const absence of Object.values(data.absences)) {
      if (absence.status === 'accepted' && absence.roleId) {
        const end = parseDate(absence.end);
        if (Date.now() > end.getTime()) {
          const member = await guild.members.fetch(absence.userId).catch(() => null);
          if (member) await member.roles.remove(absence.roleId).catch(() => {});
          absence.status = 'terminee';
          changed = true;
        }
      }
    }
    if (changed) save(guildId, data);
  }
}

async function updateServiceDashboards(client) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return;
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.json')) continue;
    const guildId = file.replace('.json', '');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const data = load(guildId);
    const dashboard = data.config.service.dashboard;
    if (!dashboard || !dashboard.channelId || !dashboard.messageId) continue;

    const channel = await guild.channels.fetch(dashboard.channelId).catch(() => null);
    if (!channel) continue;
    const message = await channel.messages.fetch(dashboard.messageId).catch(() => null);
    if (!message) continue;

    const embed = buildDashboardEmbed(data);
    await message.edit({ embeds: [embed] }).catch(() => {});
  }
}

async function runScheduledBackups(client) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return;
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.json')) continue;
    const guildId = file.replace('.json', '');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const data = load(guildId);
    if (!data.config.backup.channelId) continue;
    await performBackup(guild, data.config.backup.channelId).catch(() => {});
  }
}

async function runTicketReminders(client) {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) return;
  for (const file of fs.readdirSync(dataDir)) {
    if (!file.endsWith('.json')) continue;
    const guildId = file.replace('.json', '');
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;
    const data = load(guildId);
    if (!Object.keys(data.tickets).length) continue;
    await checkReminders(guild, data).catch(() => {});
  }
}

function startScheduler(client) {
  checkAbsences(client);
  setInterval(() => checkAbsences(client), 60 * 60 * 1000);

  updateServiceDashboards(client);
  setInterval(() => updateServiceDashboards(client), 20 * 1000);

  setInterval(() => runScheduledBackups(client), 6 * 60 * 60 * 1000);

  setInterval(() => runTicketReminders(client), 60 * 60 * 1000);
}

module.exports = { startScheduler };
