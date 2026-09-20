const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load } = require('../storage');
const { buildPanelEmbed, buildPanelRow } = require('../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Poster le menu de création de tickets dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    if (!data.config.tickets.categories.length) {
      return interaction.reply({
        content: "⚠️ Ajoute au moins une catégorie avec `/ticket-category ajouter` avant de poster le panneau.",
        ephemeral: true
      });
    }
    await interaction.channel.send({ embeds: [buildPanelEmbed()], components: [buildPanelRow(data)] });
    await interaction.reply({ content: '✅ Panneau posté.', ephemeral: true });
  }
};
