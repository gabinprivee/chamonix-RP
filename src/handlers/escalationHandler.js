const { load, save } = require('../storage');
const { punishAndNotify, logAlert, isExempt } = require('./protectionHandler');

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * À appeler après chaque mute (manuel /mute ou automatique anti-spam).
 * Si le membre atteint le seuil de mutes dans la journée, applique la
 * sanction configurée dans /protection-config (ban, kick ou retrait de rôles).
 */
async function recordMuteAndCheckEscalation(member, reasonLabel) {
  const guild = member.guild;
  const data = load(guild.id);
  const protection = data.config.protection;

  const today = todayKey();
  const history = data.muteHistory[member.id];
  if (!history || history.day !== today) {
    data.muteHistory[member.id] = { day: today, count: 1 };
  } else {
    history.count += 1;
  }
  const count = data.muteHistory[member.id].count;
  save(guild.id, data);

  if (!protection.enabled) return;
  if (await isExempt(guild, member.id, protection)) return;
  if (member.id === guild.ownerId) return;

  const threshold = protection.escalationThreshold || 3;
  if (count < threshold) return;

  // Réinitialise le compteur pour ne pas re-déclencher immédiatement après la sanction
  data.muteHistory[member.id].count = 0;
  save(guild.id, data);

  const label = `Escalade : ${count} mise(s) en sourdine aujourd'hui (dernière raison : ${reasonLabel})`;
  const resultat = await punishAndNotify(guild, member, protection.punishment, label);
  await logAlert(guild, protection, label, member, resultat);
}

module.exports = { recordMuteAndCheckEscalation };
