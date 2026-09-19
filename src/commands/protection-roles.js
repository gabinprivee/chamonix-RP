const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('protection-roles')
    .setDescription("Gérer les rôles sensibles : leur attribution est interdite sauf par quelqu'un de whitelist")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('ajouter')
        .setDescription('Marquer un rôle comme sensible')
        .addRoleOption(o => o.setName('role').setDescription('Rôle à protéger').setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('retirer')
        .setDescription('Ne plus considérer ce rôle comme sensible')
        .addRoleOption(o => o.setName('role').setDescription('Rôle à retirer de la liste').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la liste des rôles sensibles')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }

    const data = load(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      const role = interaction.options.getRole('role');
      if (!data.config.protection.dangerousRoles.includes(role.id)) {
        data.config.protection.dangerousRoles.push(role.id);
        save(interaction.guild.id, data);
      }
      return interaction.reply({
        content: `✅ ${role} est maintenant sensible : seules les personnes whitelist (\`/whitelist ajouter\`) pourront le donner à quelqu'un. Toute autre tentative fera perdre le rôle immédiatement et sanctionnera l'auteur.`,
        ephemeral: true
      });
    }

    if (sub === 'retirer') {
      const role = interaction.options.getRole('role');
      data.config.protection.dangerousRoles = data.config.protection.dangerousRoles.filter(id => id !== role.id);
      save(interaction.guild.id, data);
      return interaction.reply({ content: `✅ ${role} n'est plus considéré comme sensible.`, ephemeral: true });
    }

    if (sub === 'voir') {
      const list = data.config.protection.dangerousRoles;
      if (!list.length) return interaction.reply({ content: 'Aucun rôle sensible configuré.', ephemeral: true });
      return interaction.reply({ content: list.map(id => `<@&${id}>`).join('\n'), ephemeral: true });
    }
  }
};
