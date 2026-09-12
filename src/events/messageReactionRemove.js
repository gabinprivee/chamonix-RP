const { load } = require('../storage');

module.exports = {
  name: 'messageReactionRemove',
  async execute(reaction, user) {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    const guild = reaction.message.guild;
    if (!guild) return;
    const data = load(guild.id);
    const rr = data.config.reactionRole;
    if (!rr.messageId || reaction.message.id !== rr.messageId) return;

    const emojiMatch = reaction.emoji.name === rr.emoji || reaction.emoji.toString() === rr.emoji;
    if (!emojiMatch) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    if (rr.roleId && member.roles.cache.has(rr.roleId)) {
      await member.roles.remove(rr.roleId).catch(() => {});
    }
  }
};
