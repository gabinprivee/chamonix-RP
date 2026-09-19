const { handleAuditLogEntry } = require('../handlers/protectionHandler');

module.exports = {
  name: 'guildAuditLogEntryCreate',
  async execute(entry, guild) {
    await handleAuditLogEntry(entry, guild).catch(err => console.error('Erreur protection anti-nuke :', err));
  }
};
