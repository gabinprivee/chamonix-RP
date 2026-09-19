const { isStaff } = require('../permissions');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { load } = require('../storage');
const { hasRoleAtOrAbove } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder().setName('service-admin').setDescription("Ouvrir le panneau d'administration du service"),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    if (!hasRoleAtOrAbove(interaction.member, data.config.service.adminRole)) {
      return interaction.reply({ content: "⛔ Tu n'as pas la permission d'utiliser cette commande.", ephemeral: true });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('service_admin_forcestop').setLabel('Forcer la fin de service').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('service_admin_add').setLabel('Ajouter des heures').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('service_admin_remove').setLabel('Retirer des heures').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('service_admin_view').setLabel('Voir les heures').setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: "Panneau d'administration du service :", components: [row], ephemeral: true });
  }
};
