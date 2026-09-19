const { AuditLogEvent, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

// Actions considérées comme sensibles : si l'auteur n'est pas whitelist, il est sanctionné.
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
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function handleDangerousRoleAssign(entry, guild, protection, executorId) {
  if (!protection.dangerousRoles.length) return;

  const addChange = entry.changes?.find(c => c.key === '$add');
  const addedRoles = addChange?.new || [];
  const dangerous = addedRoles.filter(r => protection.dangerousRoles.includes(r.id));
  if (!dangerous.length) return;

  // Retire immédiatement le(s) rôle(s) sensible(s) donné(s) à la cible
  const target = await guild.members.fetch(entry.targetId).catch(() => null);
  if (target) {
    await target.roles.remove(dangerous.map(r => r.id)).catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const resultat = await punish(guild, member, protection.punishment);
  await logAlert(
    guild,
    protection,
    `Attribution d'un rôle sensible (${dangerous.map(r => r.name).join(', ')}) à ${target || entry.targetId}`,
    member,
    resultat
  );
}

async function handleAuditLogEntry(entry, guild) {
  const data = load(guild.id);
  const protection = data.config.protection;
  if (!protection.enabled) return;

  const executorId = entry.executorId;
  if (!executorId) return;
  if (executorId === guild.client.user.id) return; // le bot lui-même
  if (protection.whitelist.includes(executorId)) return; // personne autorisée

  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    return handleDangerousRoleAssign(entry, guild, protection, executorId);
  }

  if (!WATCHED_ACTIONS.has(entry.action)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const resultat = await punish(guild, member, protection.punishment);
  await logAlert(guild, protection, ACTION_LABELS[entry.action] || String(entry.action), member, resultat);
}

module.exports = { handleAuditLogEntry };
