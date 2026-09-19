const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { load, save } = require('../storage');
const { buildDashboardEmbed } = require('../handlers/serviceDashboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('service-dashboard')
    .setDescription('Poster un tableau qui affiche en direct qui est en service (actualisé toutes les 20s)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const embed = buildDashboardEmbed(data);
    const message = await interaction.channel.send({ embeds: [embed] });
    data.config.service.dashboard = { channelId: interaction.channel.id, messageId: message.id };
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Tableau de service posté, il se mettra à jour toutes les 20 secondes.', ephemeral: true });
  }
};
