const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load } = require('../storage');
const { postPanel } = require('../handlers/rulesHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules-panel')
    .setDescription('Poster le règlement avec le bouton d\'acceptation dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    if (!data.config.rules.text || !data.config.rules.roleId) {
      return interaction.reply({ content: "⚠️ Configure d'abord `/rules-config`.", ephemeral: true });
    }
    await postPanel(interaction);
    await interaction.reply({ content: '✅ Règlement posté.', ephemeral: true });
  }
};
