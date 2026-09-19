const fs = require('fs');
const path = require('path');
const { ChannelType, AttachmentBuilder } = require('discord.js');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');
const MAX_LOCAL_BACKUPS = 5;

function guildBackupDir(guildId) {
  const dir = path.join(BACKUP_DIR, guildId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createBackupSnapshot(guild) {
  const roles = guild.roles.cache
    .filter(r => r.id !== guild.id) // exclut @everyone
    .map(r => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position
    }));

  const channels = guild.channels.cache.map(c => ({
    name: c.name,
    type: c.type,
    position: c.position,
    parentName: c.parent ? c.parent.name : null,
    topic: c.topic || null
  }));

  return {
    guildId: guild.id,
    guildName: guild.name,
    timestamp: Date.now(),
    roles,
    channels
  };
}

function saveLocalBackup(guildId, snapshot) {
  const dir = guildBackupDir(guildId);
  const filename = `backup-${snapshot.timestamp}.json`;
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(snapshot, null, 2));

  // Ne garde que les MAX_LOCAL_BACKUPS plus récentes en local
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  while (files.length > MAX_LOCAL_BACKUPS) {
    fs.unlinkSync(path.join(dir, files.shift()));
  }
  return filename;
}

function getLatestLocalBackup(guildId) {
  const dir = guildBackupDir(guildId);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  if (!files.length) return null;
  const content = fs.readFileSync(path.join(dir, files[files.length - 1]), 'utf8');
  return JSON.parse(content);
}

async function performBackup(guild, backupChannelId) {
  const snapshot = createBackupSnapshot(guild);
  saveLocalBackup(guild.id, snapshot);

  if (backupChannelId) {
    const channel = await guild.channels.fetch(backupChannelId).catch(() => null);
    if (channel) {
      const buffer = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8');
      const date = new Date(snapshot.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const attachment = new AttachmentBuilder(buffer, { name: `sauvegarde-${date}.json` });
      await channel
        .send({
          content: `🗄️ Sauvegarde automatique — ${snapshot.roles.length} rôle(s), ${snapshot.channels.length} salon(s) — <t:${Math.floor(snapshot.timestamp / 1000)}:F>`,
          files: [attachment]
        })
        .catch(() => {});
    }
  }

  return snapshot;
}

async function restoreFromSnapshot(guild, snapshot) {
  let rolesCreated = 0;
  let channelsCreated = 0;

  // 1. Rôles manquants (comparaison par nom)
  for (const r of snapshot.roles) {
    const exists = guild.roles.cache.find(existing => existing.name === r.name);
    if (exists) continue;
    await guild.roles
      .create({
        name: r.name,
        color: r.color || undefined,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: BigInt(r.permissions)
      })
      .catch(() => {});
    rolesCreated++;
  }

  // 2. Catégories manquantes en premier
  const categories = snapshot.channels.filter(c => c.type === ChannelType.GuildCategory);
  for (const c of categories) {
    const exists = guild.channels.cache.find(existing => existing.name === c.name && existing.type === ChannelType.GuildCategory);
    if (exists) continue;
    await guild.channels.create({ name: c.name, type: ChannelType.GuildCategory }).catch(() => {});
    channelsCreated++;
  }

  // 3. Autres salons, rattachés à leur catégorie si elle existe
  const others = snapshot.channels.filter(c => c.type !== ChannelType.GuildCategory);
  for (const c of others) {
    const exists = guild.channels.cache.find(existing => existing.name === c.name && existing.type === c.type);
    if (exists) continue;
    const parent = c.parentName
      ? guild.channels.cache.find(p => p.name === c.parentName && p.type === ChannelType.GuildCategory)
      : null;
    await guild.channels
      .create({
        name: c.name,
        type: c.type,
        parent: parent ? parent.id : undefined,
        topic: c.topic || undefined
      })
      .catch(() => {});
    channelsCreated++;
  }

  return { rolesCreated, channelsCreated };
}

module.exports = { createBackupSnapshot, saveLocalBackup, getLatestLocalBackup, performBackup, restoreFromSnapshot };
