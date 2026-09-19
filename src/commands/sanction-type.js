const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sanction-type')
    .setDescription('Ajouter un type de sanction')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o.setName('nom').setDescription('Nom du type de sanction (ex: Avertissement)').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Rôle associé à cette sanction (optionnel)').setRequired(false)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const nom = interaction.options.getString('nom');
    const role = interaction.options.getRole('role');
    data.config.sanction.types.push({ name: nom, roleId: role ? role.id : null });
    save(interaction.guild.id, data);
    await interaction.reply({ content: `✅ Type de sanction "${nom}" ajouté.`, ephemeral: true });
  }
};
