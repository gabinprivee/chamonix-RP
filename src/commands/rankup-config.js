const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup-config')
    .setDescription('Configurer le rôle minimum pour effectuer un rankup/derank')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o => o.setName('role_minimum').setDescription('Rôle minimum requis pour promouvoir un membre').setRequired(true))
    .addRoleOption(o =>
      o
        .setName('role_minimum_derank')
        .setDescription('Rôle minimum requis pour /derank (optionnel, sinon identique à role_minimum)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.rankup.thresholdRole = interaction.options.getRole('role_minimum').id;
    const derankRole = interaction.options.getRole('role_minimum_derank');
    if (derankRole) data.config.rankup.derankThresholdRole = derankRole.id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        '✅ Rôle minimum enregistré. Utilise `/rankup-panel` pour gérer la hiérarchie et les messages, ou `/rankup-ladder ajouter` en ligne de commande.',
      ephemeral: true
    });
  }
};
