const { isStaff } = require('../permissions');
const { SlashCommandBuilder, ActionRowBuilder, UserSelectMenuBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sanction')
    .setDescription('Sanctionner un ou plusieurs membres'),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('sanction_multi_select')
        .setPlaceholder('Choisir un ou plusieurs membres à sanctionner')
        .setMinValues(1)
        .setMaxValues(25)
    );
    await interaction.reply({ content: 'Sélectionne le ou les membres à sanctionner :', components: [row], ephemeral: true });
  }
};
