const { EmbedBuilder } = require('discord.js');

const messageTimestamps = new Map(); // clé "guildId:userId" -> [timestamps]
const MAX_MESSAGES = 6;
const INTERVAL_MS = 6000; // 6 messages en 6 secondes = flood
const MAX_MENTIONS = 6; // 6 mentions dans un seul message = spam de mentions

async function timeoutForSpam(member, reason) {
  if (member.id === member.guild.ownerId) return 'ignoré (propriétaire du serveur)';
  try {
    await member.timeout(10 * 60 * 1000, reason).catch(() => {});
    return 'mis en sourdine 10 minutes';
  } catch (err) {
    return `échec de la sanction (${err.message})`;
  }
}

async function logSpamAlert(guild, protection, member, reason, resultat) {
  if (!protection.logChannel) return;
  const channel = await guild.channels.fetch(protection.logChannel).catch(() => null);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Anti-spam déclenché')
    .addFields(
      { name: 'Raison', value: reason },
      { name: 'Auteur', value: `${member} (${member.id})` },
      { name: 'Sanction appliquée', value: resultat }
    )
    .setColor(0xe67e22)
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Vérifie le spam de mentions et le flood de messages.
 * Retourne true si un message a été traité comme du spam (et donc supprimé).
 */
async function checkSpam(message, protection) {
  if (!protection.enabled) return false;
  if (protection.whitelist.includes(message.author.id)) return false;
  const member = message.member;
  if (!member || member.id === message.guild.ownerId) return false;

  // Anti spam de mentions dans un seul message
  const totalMentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
  if (totalMentions >= MAX_MENTIONS) {
    await message.delete().catch(() => {});
    const resultat = await timeoutForSpam(member, 'Anti-spam : trop de mentions dans un message');
    await logSpamAlert(message.guild, protection, member, `Spam de mentions (${totalMentions} mentions dans un message)`, resultat);
    return true;
  }

  // Anti flood de messages
  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const timestamps = (messageTimestamps.get(key) || []).filter(t => now - t < INTERVAL_MS);
  timestamps.push(now);
  messageTimestamps.set(key, timestamps);

  if (timestamps.length >= MAX_MESSAGES) {
    messageTimestamps.delete(key);
    const resultat = await timeoutForSpam(member, 'Anti-spam : flood de messages');
    await logSpamAlert(message.guild, protection, member, `Flood de messages (${timestamps.length} messages en ${INTERVAL_MS / 1000}s)`, resultat);
    return true;
  }

  return false;
}

module.exports = { checkSpam };
