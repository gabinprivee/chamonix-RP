const { handleMemberUpdate } = require('../handlers/protectionHandler');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    await handleMemberUpdate(oldMember, newMember).catch(err => console.error('Erreur protection (guildMemberUpdate) :', err));
  }
};
