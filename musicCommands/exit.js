const { VoiceConnectionStatus } = require('@discordjs/voice');
const playModule = require('./play.js');

module.exports = {
  name: 'exit',
  description: 'disconnect the music bot',
  execute: (message, args) => {
    const currentConnection = playModule.getCurrentConnection();
    if (currentConnection && currentConnection.state.status === VoiceConnectionStatus.Ready) {
      playModule.pause();
    } else {
      message.reply('❌ The bot is not currently playing any music.');
    }
  },
};
