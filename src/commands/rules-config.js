const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules-config')
    .setDescription('Configurer le règlement (rôle donné + texte)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o => o.setName('role').setDescription("Rôle donné à l'acceptation du règlement").setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const roleId = interaction.options.getRole('role').id;

    const modal = new ModalBuilder().setCustomId(`rules_config_modal_${roleId}`).setTitle('Texte du règlement');
    const input = new TextInputBuilder()
      .setCustomId('texte')
      .setLabel('Règlement (affiché tel quel)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(4000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  }
};
