const { logVoiceActivity } = require('../handlers/modlogHandler');
const { checkBdaJoin } = require('../handlers/bdaHandler');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    await logVoiceActivity(oldState, newState).catch(err => console.error('Erreur modlog (voiceStateUpdate) :', err.message));
    await checkBdaJoin(oldState, newState).catch(err => console.error('Erreur BDA (voiceStateUpdate) :', err.message));
  }
};
