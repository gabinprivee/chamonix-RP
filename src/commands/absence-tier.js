const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('absence-tier')
    .setDescription("Ajouter un palier de durée d'absence (rôle attribué selon la durée)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(o => o.setName('jours_max').setDescription('Nombre de jours maximum pour ce palier').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Rôle à attribuer pour ce palier').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const maxDays = interaction.options.getInteger('jours_max');
    const role = interaction.options.getRole('role');
    data.config.absence.tiers.push({ maxDays, roleId: role.id });
    data.config.absence.tiers.sort((a, b) => a.maxDays - b.maxDays);
    save(interaction.guild.id, data);
    await interaction.reply({ content: `✅ Palier ajouté : ≤ ${maxDays} jour(s) → ${role}`, ephemeral: true });
  }
};
