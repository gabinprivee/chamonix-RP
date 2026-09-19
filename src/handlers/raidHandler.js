const { EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

const joinTimestamps = new Map(); // guildId -> [timestamps]
const lastAlertAt = new Map(); // guildId -> timestamp de la dernière alerte
const RAID_WINDOW_MS = 15 * 1000; // fenêtre de 15 secondes
const RAID_THRESHOLD = 5; // 5 arrivées en 15s déclenche l'alerte
const ALERT_COOLDOWN_MS = 60 * 1000; // pas plus d'une alerte par minute

async function checkRaid(member) {
  const data = load(member.guild.id);
  const protection = data.config.protection;
  if (!protection.enabled || !protection.logChannel) return;

  const now = Date.now();
  const key = member.guild.id;
  const timestamps = (joinTimestamps.get(key) || []).filter(t => now - t < RAID_WINDOW_MS);
  timestamps.push(now);
  joinTimestamps.set(key, timestamps);

  if (timestamps.length < RAID_THRESHOLD) return;

  const last = lastAlertAt.get(key) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return;
  lastAlertAt.set(key, now);

  const channel = await member.guild.channels.fetch(protection.logChannel).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🚨 Raid potentiel détecté')
    .setDescription(
      `${timestamps.length} arrivées en moins de ${RAID_WINDOW_MS / 1000} secondes. Vérifiez les nouveaux membres — pense à activer \`/captcha-config\` si ce n'est pas déjà fait.`
    )
    .setColor(0xe67e22)
    .setTimestamp();
  await channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { checkRaid };
