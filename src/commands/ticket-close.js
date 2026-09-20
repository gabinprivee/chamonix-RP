const { isStaff } = require('../permissions');
const { SlashCommandBuilder } = require('discord.js');
const { closeTicket } = require('../handlers/ticketHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Fermer le ticket dans lequel cette commande est utilisée'),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    await closeTicket(interaction);
  }
};
