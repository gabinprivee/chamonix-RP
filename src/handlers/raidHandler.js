const { EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

const joinTimestamps = new Map(); // guildId -> [{ timestamp, memberId }]
const lastAlertAt = new Map(); // guildId -> timestamp
const lockdownActive = new Map(); // guildId -> true pendant un verrouillage temporaire

async function checkRaid(member) {
  const data = load(member.guild.id);
  const protection = data.config.protection;
  if (!protection.enabled) return;

  const raidConfig = protection.raid || {};
  const windowMs = (raidConfig.windowSeconds || 15) * 1000;
  const threshold = raidConfig.thresholdJoins || 5;

  const now = Date.now();
  const key = member.guild.id;
  const entries = (joinTimestamps.get(key) || []).filter(e => now - e.timestamp < windowMs);
  entries.push({ timestamp: now, memberId: member.id });
  joinTimestamps.set(key, entries);

  if (entries.length < threshold) return;

  const last = lastAlertAt.get(key) || 0;
  const cooldownMs = 60 * 1000;
  const isNewAlert = now - last >= cooldownMs;
  if (isNewAlert) lastAlertAt.set(key, now);

  // Expulsion des comptes très récents créés pendant la fenêtre de raid détectée
  if (raidConfig.kickNewAccounts) {
    const minDays = raidConfig.newAccountMinDays || 3;
    const minAgeMs = minDays * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      const m = await member.guild.members.fetch(entry.memberId).catch(() => null);
      if (!m) continue;
      const accountAge = now - m.user.createdTimestamp;
      if (accountAge < minAgeMs) {
        await m.kick('Protection anti-raid : compte trop récent pendant une vague d\'arrivées suspecte').catch(() => {});
      }
    }
  }

  // Verrouillage temporaire : hausse le niveau de vérification du serveur
  if (raidConfig.tempLockdown && !lockdownActive.get(key)) {
    lockdownActive.set(key, true);
    const previousLevel = member.guild.verificationLevel;
    await member.guild.setVerificationLevel(4, 'Protection anti-raid : verrouillage temporaire').catch(() => {});
    const lockdownMs = (raidConfig.lockdownMinutes || 10) * 60 * 1000;
    setTimeout(async () => {
      await member.guild.setVerificationLevel(previousLevel, 'Fin du verrouillage anti-raid automatique').catch(() => {});
      lockdownActive.delete(key);
    }, lockdownMs);
  }

  if (!isNewAlert || !protection.logChannel) return;
  const channel = await member.guild.channels.fetch(protection.logChannel).catch(() => null);
  if (!channel) return;

  const actions = [];
  if (raidConfig.kickNewAccounts) actions.push('expulsion des comptes récents');
  if (raidConfig.tempLockdown) actions.push(`verrouillage temporaire (${raidConfig.lockdownMinutes || 10} min)`);

  const embed = new EmbedBuilder()
    .setTitle('🚨 Raid potentiel détecté')
    .setDescription(
      `${entries.length} arrivées en moins de ${windowMs / 1000} secondes.` +
        (actions.length ? `\nActions automatiques : ${actions.join(', ')}.` : '\nAucune action automatique configurée (voir /raid-config).')
    )
    .setColor(0xe67e22)
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { checkRaid };
