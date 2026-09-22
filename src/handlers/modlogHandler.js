const { EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

async function sendToChannel(guild, channelId, embed) {
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logMessageEdit(oldMessage, newMessage) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  const data = load(newMessage.guild.id);
  const channelId = data.config.modlog.messageEdit;
  if (!channelId) return;
  if (oldMessage.content === newMessage.content) return; // rien de visible n'a changé (ex: embed chargé après coup)

  const embed = new EmbedBuilder()
    .setTitle('✏️ Message modifié')
    .addFields(
      { name: 'Auteur', value: `${newMessage.author} (${newMessage.author.id})` },
      { name: 'Salon', value: `${newMessage.channel}` },
      { name: 'Avant', value: (oldMessage.content || '_(non disponible)_').slice(0, 1000) },
      { name: 'Après', value: (newMessage.content || '_(vide)_').slice(0, 1000) }
    )
    .setColor(0xf0b232)
    .setTimestamp();
  await sendToChannel(newMessage.guild, channelId, embed);
}

async function logMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  const data = load(message.guild.id);
  const channelId = data.config.modlog.messageDelete;
  if (!channelId) return;

  const embed = new EmbedBuilder()
    .setTitle('🗑️ Message supprimé')
    .addFields(
      { name: 'Auteur', value: message.author ? `${message.author} (${message.author.id})` : 'Inconnu' },
      { name: 'Salon', value: `${message.channel}` },
      { name: 'Contenu', value: (message.content || '_(non disponible — message non mis en cache)_').slice(0, 1000) }
    )
    .setColor(0xe74c3c)
    .setTimestamp();
  await sendToChannel(message.guild, channelId, embed);
}

async function logNicknameChange(oldMember, newMember) {
  const data = load(newMember.guild.id);
  const channelId = data.config.modlog.nickname;
  if (!channelId) return;
  if (oldMember.nickname === newMember.nickname) return;

  const embed = new EmbedBuilder()
    .setTitle('📝 Pseudo modifié')
    .addFields(
      { name: 'Membre', value: `${newMember} (${newMember.id})` },
      { name: 'Avant', value: oldMember.nickname || oldMember.user.username },
      { name: 'Après', value: newMember.nickname || newMember.user.username }
    )
    .setColor(0x5865f2)
    .setTimestamp();
  await sendToChannel(newMember.guild, channelId, embed);
}

async function logVoiceActivity(oldState, newState) {
  const guild = newState.guild;
  const data = load(guild.id);
  const channelId = data.config.modlog.voice;
  if (!channelId) return;

  const member = newState.member;
  if (!member || member.user.bot) return;

  let description;
  if (!oldState.channelId && newState.channelId) {
    description = `${member} a rejoint 🔊 ${newState.channel.name}`;
  } else if (oldState.channelId && !newState.channelId) {
    description = `${member} a quitté 🔊 ${oldState.channel.name}`;
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    description = `${member} est passé de 🔊 ${oldState.channel.name} à 🔊 ${newState.channel.name}`;
  } else {
    return; // rien de pertinent (mute/deaf, etc.)
  }

  const embed = new EmbedBuilder().setDescription(description).setColor(0x2ecc71).setTimestamp();
  await sendToChannel(guild, channelId, embed);
}

module.exports = { logMessageEdit, logMessageDelete, logNicknameChange, logVoiceActivity };
