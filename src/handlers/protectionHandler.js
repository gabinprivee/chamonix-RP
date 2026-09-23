const { AuditLogEvent, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { load } = require('../storage');

const WATCHED_ACTIONS = new Set([
  AuditLogEvent.ChannelDelete,
  AuditLogEvent.ChannelCreate,
  AuditLogEvent.RoleDelete,
  AuditLogEvent.RoleCreate,
  AuditLogEvent.MemberBanAdd,
  AuditLogEvent.MemberKick,
  AuditLogEvent.WebhookCreate
]);

const ACTION_LABELS = {
  [AuditLogEvent.ChannelDelete]: 'Suppression de salon',
  [AuditLogEvent.ChannelCreate]: 'Création de salon',
  [AuditLogEvent.RoleDelete]: 'Suppression de rôle',
  [AuditLogEvent.RoleCreate]: 'Création de rôle',
  [AuditLogEvent.MemberBanAdd]: 'Bannissement',
  [AuditLogEvent.MemberKick]: 'Expulsion',
  [AuditLogEvent.WebhookCreate]: "Création d'un webhook"
};

// Suivi des actions sensibles par auteur, pour détecter une rafale (comportement typique de nuke bot)
const actionHistory = new Map(); // clé "guildId:userId" -> [timestamps]

/**
 * Un utilisateur est exempté de la protection s'il est directement whitelist,
 * ou s'il possède un rôle marqué whitelist.
 */
async function isExempt(guild, userId, protection) {
  if (protection.whitelist.includes(userId)) return true;
  if (!protection.whitelistRoles?.length) return false;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return false;
  return member.roles.cache.some(r => protection.whitelistRoles.includes(r.id));
}

function recordActionAndCheckFlood(guild, userId, protection) {
  const key = `${guild.id}:${userId}`;
  const now = Date.now();
  const windowMs = (protection.actionFlood?.windowSeconds || 10) * 1000;
  const threshold = protection.actionFlood?.threshold || 3;

  const timestamps = (actionHistory.get(key) || []).filter(t => now - t < windowMs);
  timestamps.push(now);
  actionHistory.set(key, timestamps);

  return timestamps.length >= threshold;
}

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
  await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
}

/**
 * Applique la sanction en tenant compte d'une éventuelle escalade automatique
 * (rafale d'actions sensibles en peu de temps = comportement de nuke bot avéré).
 */
async function punishWithFloodCheck(guild, member, protection, label) {
  const isFlood = recordActionAndCheckFlood(guild, member.id, protection);
  const punishment = isFlood ? 'ban' : protection.punishment;
  const finalLabel = isFlood ? `${label} — ESCALADE AUTOMATIQUE (rafale d'actions détectée)` : label;
  const resultat = await punishAndNotify(guild, member, punishment, finalLabel);
  return { resultat, finalLabel };
}

/**
 * Toute attribution de rôle (n'importe lequel) par quelqu'un de non whitelist
 * est annulée et sanctionnée — pas seulement les rôles marqués "sensibles".
 */
async function handleRoleAssign(entry, guild, protection, executorId) {
  const addChange = entry.changes?.find(c => c.key === '$add');
  const allAddedRoles = addChange?.new || [];
  if (!allAddedRoles.length) return;

  const isSelfAssign = entry.targetId === executorId;
  // Auto-attribution (onboarding Discord, sélection de rôle par soi-même) : normal,
  // on ne bloque que si le rôle est explicitement marqué "sensible".
  // Attribution à quelqu'un d'autre : toujours bloquée si l'auteur n'est pas whitelist.
  const addedRoles = isSelfAssign ? allAddedRoles.filter(r => protection.dangerousRoles.includes(r.id)) : allAddedRoles;
  if (!addedRoles.length) return;

  const target = await guild.members.fetch(entry.targetId).catch(() => null);
  if (target) {
    await target.roles.remove(addedRoles.map(r => r.id)).catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Attribution non autorisée de rôle(s) (${addedRoles.map(r => r.name).join(', ')}) à ${target || entry.targetId}`;
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
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
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

/**
 * Détecte une élévation de permissions sur un rôle EXISTANT (ex: ajout de la
 * permission Administrateur) sans passer par une suppression/création de rôle.
 * Restaure les anciennes permissions et sanctionne l'auteur.
 */
async function handleRoleUpdate(entry, guild, protection, executorId) {
  const permChange = (entry.changes || []).find(c => c.key === 'permissions');
  if (!permChange) return;

  const oldPerms = new PermissionsBitField(BigInt(permChange.old || 0));
  const newPerms = new PermissionsBitField(BigInt(permChange.new || 0));
  const gained = newPerms.remove(oldPerms); // permissions présentes dans new mais pas dans old
  const dangerousGained = ['Administrator', 'BanMembers', 'KickMembers', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageWebhooks'].filter(
    p => gained.has(p)
  );
  if (!dangerousGained.length) return;

  const role = await guild.roles.fetch(entry.targetId).catch(() => null);
  if (role) {
    await role.setPermissions(BigInt(permChange.old || 0)).catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Élévation de permissions sur le rôle "${role ? role.name : entry.targetId}" (${dangerousGained.join(', ')}) — permissions restaurées`;
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

/**
 * Détecte l'ouverture de permissions sur un salon pour @everyone (ex: rendre
 * un salon privé visible/écrivable par tout le monde) — classique de nuke.
 */
async function handleChannelUpdate(entry, guild, protection, executorId) {
  const overwriteChange = (entry.changes || []).find(c => c.key === 'permission_overwrites');
  if (!overwriteChange) return;

  const oldOverwrites = overwriteChange.old || [];
  const newOverwrites = overwriteChange.new || [];
  const everyoneOld = oldOverwrites.find(o => o.id === guild.id);
  const everyoneNew = newOverwrites.find(o => o.id === guild.id);
  if (!everyoneNew) return;

  const oldDeny = BigInt(everyoneOld?.deny || 0);
  const newDeny = BigInt(everyoneNew?.deny || 0);
  const viewChannelBit = PermissionsBitField.Flags.ViewChannel;
  const wasHidden = (oldDeny & viewChannelBit) === viewChannelBit;
  const isStillHidden = (newDeny & viewChannelBit) === viewChannelBit;

  if (!wasHidden || isStillHidden) return; // pas un cas d'ouverture d'un salon caché

  const channel = await guild.channels.fetch(entry.targetId).catch(() => null);
  if (channel && everyoneOld) {
    await channel.permissionOverwrites.edit(guild.id, {}, { reason: 'Restauration après protection anti-nuke' }).catch(() => {});
    await channel.permissionOverwrites
      .create(guild.id, { ViewChannel: false })
      .catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Salon "${channel ? channel.name : entry.targetId}" rendu visible par @everyone — refermé automatiquement`;
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

/**
 * Un bot ajouté par quelqu'un de non whitelist est expulsé immédiatement,
 * en plus de sanctionner la personne qui l'a invité.
 */
async function handleBotAdd(entry, guild, protection, executorId) {
  const botMember = await guild.members.fetch(entry.targetId).catch(err => {
    console.error('Protection anti-nuke : impossible de récupérer le bot ajouté :', err.message);
    return null;
  });
  if (botMember) {
    await botMember
      .kick('Protection anti-nuke : bot ajouté par une personne non whitelist')
      .catch(err => console.error('Protection anti-nuke : impossible d\'expulser le bot ajouté (vérifie que le rôle du bot est au-dessus) :', err.message));
  } else {
    console.error(`Protection anti-nuke : bot ajouté (id ${entry.targetId}) introuvable, expulsion impossible.`);
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Ajout du bot ${botMember ? botMember.user.tag : entry.targetId} — bot expulsé automatiquement`;
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

/**
 * Une invitation créée sans expiration ET sans limite d'utilisation par
 * quelqu'un de non whitelist est classiquement utilisée pour revenir raider
 * un serveur après coup, même après un ban de masse. On la supprime aussitôt.
 */
async function handleInviteCreate(entry, guild, protection, executorId) {
  const maxAgeChange = (entry.changes || []).find(c => c.key === 'max_age');
  const maxUsesChange = (entry.changes || []).find(c => c.key === 'max_uses');
  const maxAge = maxAgeChange ? maxAgeChange.new : entry.extra?.maxAge;
  const maxUses = maxUsesChange ? maxUsesChange.new : entry.extra?.maxUses;
  const isPermanentAndUnlimited = (!maxAge || maxAge === 0) && (!maxUses || maxUses === 0);
  if (!isPermanentAndUnlimited) return;

  const codeChange = (entry.changes || []).find(c => c.key === 'code');
  const code = codeChange ? codeChange.new : null;
  if (code) {
    await guild.invites.delete(code, 'Protection anti-nuke : invitation permanente et illimitée non autorisée').catch(() => {});
  }

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = `Création d'une invitation permanente et illimitée${code ? ` (code ${code})` : ''} — supprimée automatiquement`;
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

async function handleAuditLogEntry(entry, guild) {
  const data = load(guild.id);
  const protection = data.config.protection;
  if (!protection.enabled) return;

  const executorId = entry.executorId;
  if (!executorId) return;
  if (executorId === guild.client.user.id) return;
  if (await isExempt(guild, executorId, protection)) return;

  if (entry.action === AuditLogEvent.MemberRoleUpdate) {
    return handleRoleAssign(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.GuildUpdate) {
    return handleGuildUpdate(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.RoleUpdate) {
    return handleRoleUpdate(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.ChannelUpdate) {
    return handleChannelUpdate(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.BotAdd) {
    return handleBotAdd(entry, guild, protection, executorId);
  }
  if (entry.action === AuditLogEvent.InviteCreate) {
    return handleInviteCreate(entry, guild, protection, executorId);
  }

  if (!WATCHED_ACTIONS.has(entry.action)) return;

  const member = await guild.members.fetch(executorId).catch(() => null);
  if (!member) return;

  const label = ACTION_LABELS[entry.action] || String(entry.action);
  const { resultat, finalLabel } = await punishWithFloodCheck(guild, member, protection, label);
  await logAlert(guild, protection, finalLabel, member, resultat);
}

module.exports = { handleAuditLogEntry, punish, punishAndNotify, logAlert, notifyMember, isExempt };
