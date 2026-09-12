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

module.exports = { hasRoleAtOrAbove };
