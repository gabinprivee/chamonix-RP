const { EmbedBuilder } = require('discord.js');

const messageTimestamps = new Map(); // clé "guildId:userId" -> [timestamps]

async function timeoutForSpam(member, reason) {
  if (member.id === member.guild.ownerId) return 'ignoré (propriétaire du serveur)';
  try {
    await member.timeout(10 * 60 * 1000, reason).catch(() => {});
    await member
      .send(`🛡️ Tu as été mis en sourdine 10 minutes sur **${member.guild.name}** (anti-spam).\nRaison : ${reason}`)
      .catch(() => {});
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
  await channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
}

async function checkSpam(message, protection) {
  if (!protection.enabled) return false;
  if (protection.whitelist.includes(message.author.id)) return false;

  let member = message.member;
  if (!member) {
    member = await message.guild.members.fetch(message.author.id).catch(() => null);
  }
  if (!member || member.id === message.guild.ownerId) return false;

  const { maxMentions, maxMessages, intervalSeconds } = protection.antiSpam;
  const intervalMs = (intervalSeconds || 6) * 1000;

  // Anti spam de mentions dans un seul message
  const totalMentions = message.mentions.users.size + message.mentions.roles.size + (message.mentions.everyone ? 1 : 0);
  if (totalMentions >= (maxMentions || 6)) {
    await message.delete().catch(() => {});
    const reason = `Spam de mentions (${totalMentions} mentions dans un message)`;
    const resultat = await timeoutForSpam(member, reason);
    await logSpamAlert(message.guild, protection, member, reason, resultat);
    return true;
  }

  // Anti flood de messages
  const now = Date.now();
  const key = `${message.guild.id}:${message.author.id}`;
  const timestamps = (messageTimestamps.get(key) || []).filter(t => now - t < intervalMs);
  timestamps.push(now);
  messageTimestamps.set(key, timestamps);

  if (timestamps.length >= (maxMessages || 6)) {
    messageTimestamps.delete(key);
    const reason = `Flood de messages (${timestamps.length} messages en ${intervalSeconds || 6}s)`;
    const resultat = await timeoutForSpam(member, reason);
    await logSpamAlert(message.guild, protection, member, reason, resultat);
    return true;
  }

  return false;
}

module.exports = { checkSpam };
