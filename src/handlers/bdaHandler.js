const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { load } = require('../storage');

async function checkBdaJoin(oldState, newState) {
  const data = load(newState.guild.id);
  const bda = data.config.bda;
  if (!bda.waitingChannelId || !bda.notifyChannelId) return;
  if (newState.channelId !== bda.waitingChannelId) return;
  if (oldState.channelId === newState.channelId) return; // pas une nouvelle arrivée dans ce salon

  const member = newState.member;
  if (!member || member.user.bot) return;

  const channel = await newState.guild.channels.fetch(bda.notifyChannelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('📞 Nouvelle demande de support vocal')
    .setDescription(
      "Un membre attend dans le salon de support.\nRejoins un **salon vocal** puis clique sur **Accepter** pour l'y déplacer.\nClique sur **Refuser** pour le déconnecter."
    )
    .addFields(
      { name: 'Membre', value: `${member} (${member.user.username})` },
      { name: "Salon d'attente", value: `${newState.channel}` },
      { name: 'Heure', value: new Date().toLocaleTimeString('fr-FR') }
    )
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`bda_accept_${member.id}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`bda_refuse_${member.id}`).setLabel('Refuser').setStyle(ButtonStyle.Danger)
  );

  const mention = bda.notifyRoleId ? `<@&${bda.notifyRoleId}>` : '';
  await channel.send({ content: mention, embeds: [embed], components: [row] }).catch(() => {});
}

async function handleAccept(interaction, targetUserId) {
  const staffVoiceChannelId = interaction.member.voice.channelId;
  if (!staffVoiceChannelId) {
    return interaction.reply({ content: '⚠️ Tu dois toi-même être dans un salon vocal pour accepter.', ephemeral: true });
  }

  const target = await interaction.guild.members.fetch(targetUserId).catch(() => null);
  if (!target || !target.voice.channelId) {
    await interaction.update({ components: [] }).catch(() => {});
    return interaction.followUp({ content: "⚠️ Ce membre n'est plus en vocal.", ephemeral: true });
  }

  await target.voice.setChannel(staffVoiceChannelId).catch(() => {});
  await interaction.update({ content: `✅ Accepté par ${interaction.user} — membre déplacé.`, embeds: [], components: [] }).catch(() => {});
}

async function handleRefuse(interaction, targetUserId) {
  const target = await interaction.guild.members.fetch(targetUserId).catch(() => null);
  if (target && target.voice.channelId) {
    await target.voice.disconnect().catch(() => {});
  }
  await interaction.update({ content: `❌ Refusé par ${interaction.user} — membre déconnecté.`, embeds: [], components: [] }).catch(() => {});
}

module.exports = { checkBdaJoin, handleAccept, handleRefuse };
