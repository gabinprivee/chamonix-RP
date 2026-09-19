const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup-ladder')
    .setDescription('Gérer la hiérarchie des grades pour le rankup')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc =>
      sc
        .setName('ajouter')
        .setDescription('Ajouter un grade à la fin de la hiérarchie (du plus bas au plus haut)')
        .addRoleOption(o => o.setName('role').setDescription('Rôle du grade').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la hiérarchie actuelle'))
    .addSubcommand(sc => sc.setName('vider').setDescription('Réinitialiser la hiérarchie')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      const role = interaction.options.getRole('role');
      data.config.rankup.ladder.push(role.id);
      save(interaction.guild.id, data);
      return interaction.reply({ content: `✅ ${role} ajouté à la position ${data.config.rankup.ladder.length}.`, ephemeral: true });
    }

    if (sub === 'voir') {
      const ladder = data.config.rankup.ladder;
      if (!ladder.length) return interaction.reply({ content: 'Aucun grade configuré.', ephemeral: true });
      const list = ladder.map((id, i) => `${i + 1}. <@&${id}>`).join('\n');
      return interaction.reply({ content: list, ephemeral: true });
    }

    if (sub === 'vider') {
      data.config.rankup.ladder = [];
      save(interaction.guild.id, data);
      return interaction.reply({ content: '✅ Hiérarchie réinitialisée.', ephemeral: true });
    }
  }
};
