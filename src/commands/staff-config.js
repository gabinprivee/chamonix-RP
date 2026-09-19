const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-config')
    .setDescription("Définir le rôle minimum requis pour utiliser les commandes d'administration du bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o => o.setName('role').setDescription('Rôle minimum (ou au-dessus) requis').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.staffRole = interaction.options.getRole('role').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Désormais, seules les personnes ayant ${interaction.options.getRole('role')} ou un rôle au-dessus pourront utiliser les commandes d'administration du bot.`,
      ephemeral: true
    });
  }
};
