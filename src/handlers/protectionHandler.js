const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

const WATCHED_ACTIONS = new Set([
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberKick,
  AuditLogEvent.WebhookCreate,
  AuditLogEvent.BotAdd
]);

const ACTION_LABELS = {
  [AuditLogEvent.ChannelDelete]: 'Suppression de salon',
  [AuditLogEvent.RoleDelete]: 'Suppression de rôle',
  [AuditLogEvent.MemberBanAdd]: 'Bannissement',
  [AuditLogEvent.MemberKick]: 'Expulsion',
  [AuditLogEvent.WebhookCreate]: "Création d'un webhook",
  [AuditLogEvent.BotAdd]: "Ajout d'un bot/intégration"
};

async function notifyMember(member, reason) {
  await member
    .send(`🛡️ Tu as été sanctionné automatiquement sur **${member.guild.name}** par la protection anti-nuke.\nRaison : ${reason}`)
    .catch(() => {});
}

async function punish(guild, member, punishment) {
  if (member.id === guild.ownerId) return 'ignoré (propriétaire du serveur)';
  if (member.id === guild.client.user.id) return 'ignoré (le bot lui-même)';

  try {
    if (punishment === 'ban') {
      await member.ban({ reason: 'Protection anti-nuke : action sensible sans être whitelist' });
      return 'banni';
    }
    if (punishment === 'kick') {
      await member.kick('Protection anti-nuke : action sensible sans être whitelist');
      return 'expulsé';
    }
    const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id);
    await member.roles.remove(rolesToRemove).catch(() => {});
    await member.timeout(24 * 60 * 60 * 1000, 'Protection anti-nuke : action sensible sans être whitelist').catch(() => {});
    return 'rôles retirés + mis en sourdine 24h';
  } catch (err) {
    return `échec de la sanction (${err.message})`;
  }
}

async function punishAndNotify(guild, member, punishment, reason) {
  const resultat = await punish(guild, member, punishment);
  await notifyMember(member, reason);
  return resultat;
}

async function logAlert(guild, protection, actionLabel, member, resultat) {
  if (!protection.logChannel) return;
  const channel = await guild.channels.fetch(protection.logChannel).catch(() => null);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Protection anti-nuke déclenchée')
    .addFields(
      { name: 'Action détectée', value: actionLabel },
      { name: 'Auteur', value: `${member} (${member.id})` },
      { name: 'Sanction appliquée', value: resultat }
    )
    .setColor(0xe74c3c)
    .setTimestamp();
  // Le "content" ping réellement la personne, contrairement à un simple champ d'embed
  await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
}

async function handleDangerousRoleAssign(entry, guild, protection, executorId) {
  if (!protection.dangerousRoles.length) return;

  const addChange = entry.changes?.find(c => c.key === '$add');
  const addedRoles = addChange?.new || [];
  const dangerous = addedRoles.filter(r => protection.dangerousRoles.includes(r.id));
  if (!dangerous.length) return;

  const target = await guild.members.fetch(entry.targetId).catch(() => null);
  if (target) {
    await target.roles.remove(dangerous.map(r => r.id)).catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Attribution d'un rôle sensible (${dangerous.map(r => r.name).join(', ')}) à ${target || entry.targetId}`;
  const resultat = await punishAndNotify(guild, member, protection.punishment, label);
  await logAlert(guild, protection, label, member, resultat);
}

async function handleGuildUpdate(entry, guild, protection, executorId) {
  const relevantKeys = ['name', 'icon', 'vanity_url_code'];
  const changes = (entry.changes || []).filter(c => relevantKeys.includes(c.key));
  if (!changes.length) return;

  const nameChange = changes.find(c => c.key === 'name');
  let revertNote = '';
  if (nameChange && nameChange.old) {
    await guild.setName(nameChange.old).catch(() => {});
    revertNote = ' — nom du serveur restauré automatiquement';
  }
  const hasIconOrVanity = changes.some(c => c.key === 'icon' || c.key === 'vanity_url_code');
  if (hasIconOrVanity) {
    revertNote += " — icône/lien personnalisé à restaurer manuellement si besoin (dernière sauvegarde : /backup-now)";
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Modification du serveur (${changes.map(c => c.key).join(', ')})${revertNote}`;
  const resultat = await punishAndNotify(guild, member, protection.punishment, label);
  await logAlert(guild, protection, label, member, resultat);
}

/**
 * Filet de sécurité : détecte toute apparition d'un rôle sensible sur un membre,
 * même quand elle n'est pas passée par le chemin normal (ex: auto-attribution via
 * un menu de rôles Discord natif, qui ne génère pas toujours d'entrée de journal
 * d'audit). Laisse d'abord une marge à guildAuditLogEntryCreate pour traiter le cas.
 */
async function handleMemberUpdate(oldMember, newMember) {
  const data = load(newMember.guild.id);
  const protection = data.config.protection;
  if (!protection.enabled || !protection.dangerousRoles.length) return;
  if (protection.whitelist.includes(newMember.id)) return;
  if (newMember.id === newMember.guild.ownerId) return;

  const addedDangerous = newMember.roles.cache.filter(
    r => !oldMember.roles.cache.has(r.id) && protection.dangerousRoles.includes(r.id)
  );
  if (!addedDangerous.size) return;

  await new Promise(res => setTimeout(res, 2000));

  const fresh = await newMember.fetch().catch(() => null);
  if (!fresh) return;
  const stillHas = addedDangerous.filter(r => fresh.roles.cache.has(r.id));
  if (!stillHas.size) return; // déjà traité par le chemin normal (journal d'audit)

  await fresh.roles.remove(stillHas.map(r => r.id)).catch(() => {});
  const label = `Possession non autorisée d'un rôle sensible (${stillHas.map(r => r.name).join(', ')})`;
  const resultat = await punishAndNotify(fresh.guild, fresh, protection.punishment, label);
  await logAlert(fresh.guild, protection, label, fresh, resultat);
}

async function handleAuditLogEntry(entry, guild) {
  const data = load(guild.id);
  const protection = data.config.protection;
  if (!protection.enabled) return;

  const executorId = entry.executorId;
  if (!executorId) return;
  if (executorId === guild.client.user.id) return;
  if (protection.whitelist.includes(executorId)) return;

  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    return handleDangerousRoleAssign(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.GuildUpdate) {
    return handleGuildUpdate(entry, guild, protection, executorId);
  }

  if (!WATCHED_ACTIONS.has(entry.action)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = ACTION_LABELS[entry.action] || String(entry.action);
  const resultat = await punishAndNotify(guild, member, protection.punishment, label);
  await logAlert(guild, protection, label, member, resultat);
}

module.exports = { handleAuditLogEntry, handleMemberUpdate, punish, punishAndNotify, logAlert, notifyMember };
