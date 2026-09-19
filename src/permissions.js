/**
 * Vérifie si un membre a un rôle dont la position est supérieure ou égale
 * au rôle de référence (ou est Administrateur).
 */
function hasRoleAtOrAbove(member, referenceRoleId) {
  if (!referenceRoleId) return false;
  if (member.permissions.has('Administrator')) return true;
  const refRole = member.guild.roles.cache.get(referenceRoleId);
  if (!refRole) return false;
  return member.roles.highest.position >= refRole.position;
}

/**
 * Vérifie que l'utilisateur a le rôle "staff" configuré (ou au-dessus).
 * Si aucun rôle staff n'est configuré sur le serveur, la commande reste
 * ouverte (pas de restriction supplémentaire tant que /staff-config n'a
 * pas été utilisé).
 */
async function isStaff(interaction) {
  const { load } = require('./storage');
  const data = load(interaction.guild.id);
  const staffRole = data.config.staffRole;
  if (!staffRole) return true;
  return hasRoleAtOrAbove(interaction.member, staffRole);
}

module.exports = { hasRoleAtOrAbove, isStaff };
