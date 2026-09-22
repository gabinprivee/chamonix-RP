const { load, save } = require('../storage');
const { checkSpam } = require('../handlers/antiSpamHandler');
const { checkAutomod } = require('../handlers/automodHandler');
const { assignIfStaffReply } = require('../handlers/ticketHandler');

function extractField(content, label) {
  const regex = new RegExp(`\\*\\*${label}\\*\\*\\s*:?\\s*(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const data = load(message.guild.id);

    // Anti-spam / anti-mention de masse (avant tout le reste)
    const wasSpam = await checkSpam(message, data.config.protection).catch(() => false);
    if (wasSpam) return;

    // Auto-modération de contenu (mots interdits, liens d'invitation)
    const wasAutomod = await checkAutomod(message, data.config.protection).catch(() => false);
    if (wasAutomod) return;

    // Assignation automatique des tickets au premier message d'un membre du support
    await assignIfStaffReply(message).catch(() => {});

    const identityChannel = data.config.identity.channelId;
    if (!identityChannel || message.channel.id !== identityChannel) return;

    const content = message.content;
    const psDiscord = extractField(content, 'PS Discord');
    const atDiscord = extractField(content, '@ Discord');
    const psRoblox = extractField(content, 'PS Roblox');
    const atRoblox = extractField(content, '@ Roblox');

    if (!psDiscord || !atDiscord || !psRoblox || !atRoblox) return; // format non reconnu, on ignore

    data.identities[message.author.id] = {
      psDiscord,
      atDiscord,
      psRoblox,
      atRoblox,
      updatedAt: Date.now()
    };
    save(message.guild.id, data);

    await message.react('✅').catch(() => {});
  }
};
