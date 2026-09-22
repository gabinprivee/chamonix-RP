const { EmbedBuilder } = require('discord.js');
const { load } = require('../storage');
const { isExempt } = require('./protectionHandler');
const { recordMuteAndCheckEscalation } = require('./escalationHandler');

const INVITE_REGEX = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/\S+/i;

async function logAutomod(guild, automod, member, reason, content) {
  if (!automod.logChannel) return;
  const channel = await guild.channels.fetch(automod.logChannel).catch(() => null);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle('🧹 Auto-modération')
    .addFields(
      { name: 'Raison', value: reason },
      { name: 'Auteur', value: `${member} (${member.id})` },
      { name: 'Contenu supprimé', value: content.slice(0, 1000) || '_(vide)_' }
    )
    .setColor(0xe67e22)
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Vérifie le contenu d'un message (mots interdits, liens d'invitation).
 * Retourne true si le message a été supprimé.
 */
async function checkAutomod(message, protection) {
  const data = load(message.guild.id);
  const automod = data.config.automod;
  if (!automod.enabled) return false;
  if (await isExempt(message.guild, message.author.id, protection)) return false;

  const member = message.member;
  if (!member || member.id === message.guild.ownerId) return false;

  const content = message.content || '';
  const lower = content.toLowerCase();

  let reason = null;

  const matchedWord = automod.bannedWords.find(w => lower.includes(w.toLowerCase()));
  if (matchedWord) {
    reason = `Mot interdit détecté ("${matchedWord}")`;
  } else if (automod.blockInvites && INVITE_REGEX.test(content)) {
    reason = "Lien d'invitation Discord détecté";
  }

  if (!reason) return false;

  await message.delete().catch(() => {});
  await member.timeout(5 * 60 * 1000, reason).catch(() => {});
  await message.author
    .send(`🧹 Ton message a été supprimé et tu as été mis en sourdine 5 minutes sur **${message.guild.name}**.\nRaison : ${reason}`)
    .catch(() => {});
  await logAutomod(message.guild, automod, member, reason, content);
  await recordMuteAndCheckEscalation(member, reason).catch(() => {});

  return true;
}

module.exports = { checkAutomod };
