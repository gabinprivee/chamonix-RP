const express = require('express');
const { load } = require('../storage');

function fmtHours(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

function parseDate(str) {
  const parts = String(str).split('/').map(Number);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

function absenceDaysThisMonth(absences, userId) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return Object.values(absences)
    .filter(a => a.userId === userId && (a.status === 'accepted' || a.status === 'terminee'))
    .filter(a => {
      const start = parseDate(a.start);
      return start && start.getMonth() === currentMonth && start.getFullYear() === currentYear;
    })
    .reduce((sum, a) => sum + (a.durationDays || 0), 0);
}

function checkAuth(req, res, next) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!user || !pass) return next(); // pas de protection configurée

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [u, p] = decoded.split(':');
    if (u === user && p === pass) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Dashboard"');
  return res.status(401).send('Authentification requise.');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderPage(guild, members, roles, selectedRoleId) {
  const roleOptions = roles
    .map(r => `<option value="${r.id}" ${r.id === selectedRoleId ? 'selected' : ''}>${escapeHtml(r.name)}</option>`)
    .join('');

  const rows = members
    .map(m => {
      const roleBadges = m.roles.map(r => `<span class="badge">${escapeHtml(r)}</span>`).join(' ');
      const statusLabel =
        m.status === 'running' ? '<span class="status running">🟢 En service</span>'
        : m.status === 'paused' ? '<span class="status paused">🟡 En pause</span>'
        : '<span class="status stopped">⚪ Arrêté</span>';
      return `<tr>
        <td>${escapeHtml(m.name)}</td>
        <td>${roleBadges || '—'}</td>
        <td>${fmtHours(m.totalSeconds)}</td>
        <td>${statusLabel}</td>
        <td>${m.absenceDaysThisMonth} jour(s)</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tableau de bord — ${escapeHtml(guild.name)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #1e1f22; color: #dbdee1; margin: 0; padding: 24px; }
  h1 { color: #fff; font-size: 20px; }
  .subtitle { color: #949ba4; margin-bottom: 24px; }
  form { margin-bottom: 16px; }
  select, button { background: #2b2d31; color: #dbdee1; border: 1px solid #3f4147; border-radius: 6px; padding: 6px 10px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; background: #2b2d31; border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #3f4147; font-size: 14px; }
  th { background: #232428; color: #949ba4; text-transform: uppercase; font-size: 12px; }
  .badge { display: inline-block; background: #3f4147; color: #dbdee1; border-radius: 4px; padding: 2px 8px; margin: 2px; font-size: 12px; }
  .status.running { color: #23a55a; }
  .status.paused { color: #f0b232; }
  .status.stopped { color: #949ba4; }
  .empty { padding: 24px; text-align: center; color: #949ba4; }
</style>
</head>
<body>
  <h1>🖥️ Tableau de bord — ${escapeHtml(guild.name)}</h1>
  <div class="subtitle">${members.length} membre(s) affiché(s) — lecture seule</div>

  <form method="get">
    <select name="role" onchange="this.form.submit()">
      <option value="">Tous les rôles</option>
      ${roleOptions}
    </select>
  </form>

  ${
    members.length
      ? `<table>
          <thead><tr><th>Membre</th><th>Rôles</th><th>Heures de service</th><th>Statut</th><th>Jours d'absence (ce mois)</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
      : '<div class="empty">Aucun membre à afficher.</div>'
  }
</body>
</html>`;
}

function startWebServer(client) {
  const app = express();
  app.use(checkAuth);

  app.get('/', async (req, res) => {
    const guildId = process.env.GUILD_ID || client.guilds.cache.first()?.id;
    const guild = guildId ? client.guilds.cache.get(guildId) : null;
    if (!guild) return res.send('Le bot n’est connecté à aucun serveur pour le moment.');

    await guild.members.fetch().catch(() => {});
    const data = load(guild.id);
    const selectedRoleId = req.query.role || '';

    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id) // exclut @everyone
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name }));

    let members = guild.members.cache
      .filter(m => !m.user.bot)
      .filter(m => (selectedRoleId ? m.roles.cache.has(selectedRoleId) : true))
      .map(m => {
        const session = data.service[m.id];
        let totalSeconds = session ? session.totalSeconds : 0;
        if (session && session.status === 'running') {
          totalSeconds += Math.floor((Date.now() - session.startedAt) / 1000);
        }
        return {
          name: m.displayName,
          roles: m.roles.cache.filter(r => r.id !== guild.id).map(r => r.name),
          totalSeconds,
          status: session ? session.status : 'stopped',
          absenceDaysThisMonth: absenceDaysThisMonth(data.absences, m.id)
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    res.send(renderPage(guild, members, roles, selectedRoleId));
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`✅ Tableau de bord web démarré sur le port ${port}`);
  });
}

module.exports = { startWebServer };
