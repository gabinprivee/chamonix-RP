const { logMessageEdit } = require('../handlers/modlogHandler');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    await logMessageEdit(oldMessage, newMessage).catch(err => console.error('Erreur modlog (messageUpdate) :', err.message));
  }
};
