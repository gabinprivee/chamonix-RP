const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup-config')
    .setDescription('Configurer le système de rankup')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(o => o.setName('role_minimum').setDescription('Rôle minimum requis pour promouvoir un membre').setRequired(true))
    .addRoleOption(o =>
      o
        .setName('role_promouvable')
        .setDescription("Rôle minimum qu'un membre doit déjà avoir pour pouvoir être promu (optionnel)")
        .setRequired(false)
    ),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.rankup.thresholdRole = interaction.options.getRole('role_minimum').id;
    const eligibleRole = interaction.options.getRole('role_promouvable');
    data.config.rankup.eligibleRole = eligibleRole ? eligibleRole.id : null;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: eligibleRole
        ? `✅ Configuré. Seuls les membres ayant au moins ${eligibleRole} pourront être promus. Utilise \`/rankup-ladder ajouter\` pour définir la hiérarchie des grades, du plus bas au plus haut.`
        : "✅ Rôle minimum enregistré. Utilise `/rankup-ladder ajouter` pour définir la hiérarchie des grades, du plus bas au plus haut.",
      ephemeral: true
    });
  }
};
