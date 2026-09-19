const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { load } = require('../storage');

// Stocke temporairement les codes en attente de vérification : clé "guildId:userId" -> code
const pendingCaptchas = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // évite les caractères ambigus (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function startCaptcha(member) {
  const data = load(member.guild.id);
  const captcha = data.config.captcha;
  if (!captcha.enabled) return;

  if (captcha.unverifiedRole) {
    await member.roles.add(captcha.unverifiedRole).catch(() => {});
  }

  const code = generateCode();
  pendingCaptchas.set(`${member.guild.id}:${member.id}`, code);

  const spaced = code.split('').join(' ');
  const embed = new EmbedBuilder()
    .setTitle('🔒 Vérification requise')
    .setDescription(
      `Bienvenue sur **${member.guild.name}** !\n\nPour accéder au serveur, clique sur le bouton ci-dessous et entre ce code :\n\n\`\`\`${spaced}\`\`\``
    )
    .setColor(0x5865f2);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`captcha_verify_${member.id}`).setLabel('Vérifier').setStyle(ButtonStyle.Success)
  );

  let sent = false;
  if (captcha.channelId) {
    const channel = await member.guild.channels.fetch(captcha.channelId).catch(() => null);
    if (channel) {
      await channel.send({ content: `${member}`, embeds: [embed], components: [row] }).catch(() => {});
      sent = true;
    }
  }
  if (!sent) {
    await member.send({ embeds: [embed], components: [row] }).catch(() => {});
  }
}

async function handleVerifyButton(interaction, targetUserId) {
  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: "⛔ Ce bouton n'est pas pour toi.", ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId(`captcha_modal_${targetUserId}`).setTitle('Vérification');
  const input = new TextInputBuilder().setCustomId('code').setLabel('Entre le code affiché').setStyle(TextInputStyle.Short).setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction, targetUserId) {
  if (interaction.user.id !== targetUserId) {
    return interaction.reply({ content: "⛔ Ce n'est pas pour toi.", ephemeral: true });
  }
  const key = `${interaction.guild.id}:${targetUserId}`;
  const expected = pendingCaptchas.get(key);
  if (!expected) {
    return interaction.reply({ content: '⚠️ Aucune vérification en attente (peut-être déjà validée).', ephemeral: true });
  }

  const input = interaction.fields.getTextInputValue('code').trim().toUpperCase();
  if (input !== expected) {
    return interaction.reply({ content: '❌ Code incorrect, clique de nouveau sur "Vérifier" pour réessayer.', ephemeral: true });
  }

  pendingCaptchas.delete(key);
  const data = load(interaction.guild.id);
  const captcha = data.config.captcha;
  const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
  if (member) {
    if (captcha.verifiedRole) await member.roles.add(captcha.verifiedRole).catch(() => {});
    if (captcha.unverifiedRole) await member.roles.remove(captcha.unverifiedRole).catch(() => {});
  }
  await interaction.reply({ content: '✅ Vérification réussie, bienvenue !', ephemeral: true });
}

module.exports = { startCaptcha, handleVerifyButton, handleModalSubmit };
