const { load } = require('../storage');
const { startCaptcha } = require('../handlers/captchaHandler');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const data = load(member.guild.id);

    if (data.config.welcome.channelId && data.config.welcome.joinMessage) {
      const channel = await member.guild.channels.fetch(data.config.welcome.channelId).catch(() => null);
      if (channel) {
        const text = data.config.welcome.joinMessage
          .replace(/\{membre\}/g, `${member}`)
          .replace(/\{serveur\}/g, member.guild.name);
        await channel.send({ content: text }).catch(() => {});
      }
    }

    await startCaptcha(member).catch(() => {});
  }
};
