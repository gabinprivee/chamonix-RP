const { logNicknameChange } = require('../handlers/modlogHandler');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    await logNicknameChange(oldMember, newMember).catch(err => console.error('Erreur modlog (guildMemberUpdate) :', err.message));
  }
};
