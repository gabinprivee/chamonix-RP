const { EmbedBuilder } = require('discord.js');

function fmt(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

function buildDashboardEmbed(data) {
  const entries = Object.entries(data.service || {}).filter(([, s]) => s.status === 'running' || s.status === 'paused');

  let description;
  if (!entries.length) {
    description = 'Personne n’est en service actuellement.';
  } else {
    const lines = entries.map(([userId, s]) => {
      let total = s.totalSeconds;
      if (s.status === 'running') total += Math.floor((Date.now() - s.startedAt) / 1000);
      const statusLabel = s.status === 'running' ? '🟢 En service' : '🟡 En pause';
      return `<@${userId}> — ${statusLabel} — ${fmt(total)}`;
    });
    description = lines.join('\n');
  }

  return new EmbedBuilder()
    .setTitle('🕒 Qui est en service')
    .setDescription(description)
    .setColor(0x5865f2)
    .setFooter({ text: 'Actualisé automatiquement toutes les 20 secondes' })
    .setTimestamp();
}

module.exports = { buildDashboardEmbed };
