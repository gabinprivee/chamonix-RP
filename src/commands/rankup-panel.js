const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { openPanel } = require('../handlers/rankupPanelHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup-panel')
    .setDescription('Ouvrir le panneau de gestion interactif de la hiérarchie de rankup')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    await openPanel(interaction);
  }
};
