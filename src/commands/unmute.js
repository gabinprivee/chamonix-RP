const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retirer la sourdine (timeout) à un membre')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Membre à démute').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    try {
      await target.timeout(null);
    } catch (err) {
      return interaction.reply({ content: `❌ Impossible de démute ce membre (${err.message}).`, ephemeral: true });
    }

    await interaction.reply({ content: `✅ ${target} n'est plus en sourdine.` });
  }
};
