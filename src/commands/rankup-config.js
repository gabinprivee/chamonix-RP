const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup-config')
    .setDescription('Configurer le rôle minimum pour effectuer un rankup')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(o => o.setName('role_minimum').setDescription('Rôle minimum requis pour promouvoir un membre').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.rankup.thresholdRole = interaction.options.getRole('role_minimum').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: '✅ Rôle minimum enregistré. Utilise `/rankup-ladder ajouter` pour définir la hiérarchie des grades, du plus bas au plus haut.',
      ephemeral: true
    });
  }
};
