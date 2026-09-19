const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { load, save } = require('../storage');

function buildPanelEmbed(data) {
  const rankup = data.config.rankup;
  const ladder = rankup.ladder;
  const list = ladder.length ? ladder.map((id, i) => `${i + 1}. <@&${id}>`).join('\n') : '_Aucun grade configuré._';

  return new EmbedBuilder()
    .setTitle('📊 Configuration — Rankup')
    .setDescription(`**Ordre des rangs** : le rang 1 est le plus bas.\n\n${list}`)
    .addFields(
      { name: 'Autorisés /rankup', value: rankup.thresholdRole ? `<@&${rankup.thresholdRole}> et au-dessus` : '_Non configuré_', inline: true },
      {
        name: 'Autorisés /derank',
        value: rankup.derankThresholdRole
          ? `<@&${rankup.derankThresholdRole}> et au-dessus`
          : rankup.thresholdRole
            ? `<@&${rankup.thresholdRole}> et au-dessus (identique à rankup)`
            : '_Non configuré_',
        inline: true
      },
      { name: 'Message rankup', value: rankup.messageUp || '_Par défaut_' },
      { name: 'Message derank', value: rankup.messageDown || '_Par défaut_' }
    )
    .setFooter({ text: 'Variables disponibles : {membre} {de} {a}' })
    .setColor(0x5865f2);
}

function buildPanelRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rankup_panel_add').setLabel('Ajouter un rôle').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('rankup_panel_remove').setLabel('Retirer un rôle').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('rankup_panel_clear').setLabel('Vider').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rankup_panel_close').setLabel('Fermer').setStyle(ButtonStyle.Secondary)
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rankup_panel_msg_up').setLabel('Message rankup').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('rankup_panel_msg_down').setLabel('Message derank').setStyle(ButtonStyle.Primary)
  );
  return [row1, row2];
}

async function openPanel(interaction) {
  const data = load(interaction.guild.id);
  await interaction.reply({ embeds: [buildPanelEmbed(data)], components: buildPanelRows(), ephemeral: true });
}

async function handleAddButton(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder().setCustomId('rankup_panel_add_select').setPlaceholder('Choisir le rôle à ajouter').setMinValues(1).setMaxValues(1)
  );
  await interaction.reply({ content: 'Choisis le rôle à ajouter à la hiérarchie (il sera placé au sommet) :', components: [row], ephemeral: true });
}

async function handleAddSelect(interaction) {
  const data = load(interaction.guild.id);
  const roleId = interaction.values[0];
  data.config.rankup.ladder.push(roleId);
  save(interaction.guild.id, data);
  await interaction.update({ content: `✅ <@&${roleId}> ajouté à la position ${data.config.rankup.ladder.length}.`, components: [] });
}

async function handleRemoveButton(interaction) {
  const data = load(interaction.guild.id);
  const ladder = data.config.rankup.ladder;
  if (!ladder.length) {
    return interaction.reply({ content: 'Aucun grade à retirer.', ephemeral: true });
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId('rankup_panel_remove_select')
    .setPlaceholder('Choisir le rôle à retirer')
    .addOptions(
      ladder.map((id, i) => {
        const role = interaction.guild.roles.cache.get(id);
        return { label: role ? `${i + 1}. ${role.name}` : `${i + 1}. Rôle supprimé`, value: String(i) };
      })
    );
  const row = new ActionRowBuilder().addComponents(menu);
  await interaction.reply({ content: 'Choisis le rôle à retirer de la hiérarchie :', components: [row], ephemeral: true });
}

async function handleRemoveSelect(interaction) {
  const data = load(interaction.guild.id);
  const index = Number(interaction.values[0]);
  const removedId = data.config.rankup.ladder[index];
  data.config.rankup.ladder.splice(index, 1);
  save(interaction.guild.id, data);
  await interaction.update({ content: `✅ <@&${removedId}> retiré de la hiérarchie.`, components: [] });
}

async function handleClearButton(interaction) {
  const data = load(interaction.guild.id);
  data.config.rankup.ladder = [];
  save(interaction.guild.id, data);
  await interaction.update({ embeds: [buildPanelEmbed(data)], components: buildPanelRows() });
}

async function handleCloseButton(interaction) {
  await interaction.update({ content: 'Panneau fermé.', embeds: [], components: [] });
}

async function handleMessageButton(interaction, which) {
  const modal = new ModalBuilder()
    .setCustomId(which === 'up' ? 'rankup_panel_msg_up_modal' : 'rankup_panel_msg_down_modal')
    .setTitle(which === 'up' ? 'Message de rankup' : 'Message de derank');
  const input = new TextInputBuilder()
    .setCustomId('message')
    .setLabel('Utilise {membre} {de} {a}')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleMessageModalSubmit(interaction, which) {
  const data = load(interaction.guild.id);
  const message = interaction.fields.getTextInputValue('message');
  if (which === 'up') data.config.rankup.messageUp = message;
  else data.config.rankup.messageDown = message;
  save(interaction.guild.id, data);
  await interaction.reply({ content: '✅ Message enregistré.', ephemeral: true });
}

module.exports = {
  openPanel,
  handleAddButton,
  handleAddSelect,
  handleRemoveButton,
  handleRemoveSelect,
  handleClearButton,
  handleCloseButton,
  handleMessageButton,
  handleMessageModalSubmit
};
