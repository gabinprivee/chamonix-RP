const { logMessageDelete } = require('../handlers/modlogHandler');

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    await logMessageDelete(message).catch(err => console.error('Erreur modlog (messageDelete) :', err.message));
  }
};
