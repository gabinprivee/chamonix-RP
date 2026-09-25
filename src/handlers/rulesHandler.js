const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { load, save } = require('../storage');

function buildButtonRow(count) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rules_accept').setLabel(`✅ J'accepte le règlement · ${count}`).setStyle(ButtonStyle.Success)
  );
}

async function postPanel(interaction) {
  const data = load(interaction.guild.id);
  const rules = data.config.rules;

  const embed = new EmbedBuilder().setDescription(rules.text).setColor(0x2ecc71).setFooter({ text: interaction.guild.name });
  const message = await interaction.channel.send({ embeds: [embed], components: [buildButtonRow(rules.acceptedCount)] });

  rules.channelId = interaction.channel.id;
  rules.messageId = message.id;
  save(interaction.guild.id, data);
}

async function handleAccept(interaction) {
  const data = load(interaction.guild.id);
  const rules = data.config.rules;

  if (data.ruleAcceptances[interaction.user.id]) {
    return interaction.reply({ content: 'Tu as déjà accepté le règlement.', ephemeral: true });
  }
  if (!rules.roleId) {
    return interaction.reply({ content: "⚠️ Le système de règlement n'est pas configuré (voir /rules-config).", ephemeral: true });
  }

  const member = interaction.member;
  await member.roles.add(rules.roleId).catch(() => {});

  data.ruleAcceptances[interaction.user.id] = Date.now();
  rules.acceptedCount += 1;
  save(interaction.guild.id, data);

  await interaction.update({ components: [buildButtonRow(rules.acceptedCount)] }).catch(() => {});
  await interaction.followUp({ content: '✅ Règlement accepté, bienvenue !', ephemeral: true }).catch(() => {});
}

module.exports = { postPanel, handleAccept };
