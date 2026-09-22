const { logVoiceActivity } = require('../handlers/modlogHandler');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    await logVoiceActivity(oldState, newState).catch(err => console.error('Erreur modlog (voiceStateUpdate) :', err.message));
  }
};
