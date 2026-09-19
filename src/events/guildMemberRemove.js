const { load } = require('../storage');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const data = load(member.guild.id);
    if (!data.config.welcome.channelId || !data.config.welcome.leaveMessage) return;
    const channel = await member.guild.channels.fetch(data.config.welcome.channelId).catch(() => null);
    if (!channel) return;
    const text = data.config.welcome.leaveMessage
      .replace(/\{membre\}/g, member.user.tag)
      .replace(/\{serveur\}/g, member.guild.name);
    await channel.send({ content: text }).catch(() => {});
  }
};
