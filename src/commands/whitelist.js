const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gérer la liste blanche de la protection anti-nuke (par personne ou par rôle)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('ajouter')
        .setDescription('Autoriser un membre à effectuer des actions sensibles')
        .addUserOption(o => o.setName('membre').setDescription('Membre à whitelist').setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('retirer')
        .setDescription('Retirer un membre de la liste blanche')
        .addUserOption(o => o.setName('membre').setDescription('Membre à retirer').setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('role-ajouter')
        .setDescription('Autoriser tout le monde ayant ce rôle à effectuer des actions sensibles')
        .addRoleOption(o => o.setName('role').setDescription('Rôle à whitelist').setRequired(true))
    )
    .addSubcommand(sc =>
      sc
        .setName('role-retirer')
        .setDescription('Retirer un rôle de la liste blanche')
        .addRoleOption(o => o.setName('role').setDescription('Rôle à retirer').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la liste blanche actuelle (personnes et rôles)')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      const membre = interaction.options.getUser('membre');
      if (!data.config.protection.whitelist.includes(membre.id)) {
        data.config.protection.whitelist.push(membre.id);
        save(interaction.guild.id, data);
      }
      return interaction.reply({ content: `✅ ${membre} est maintenant whitelist.`, ephemeral: true });
    }

    if (sub === 'retirer') {
      const membre = interaction.options.getUser('membre');
      data.config.protection.whitelist = data.config.protection.whitelist.filter(id => id !== membre.id);
      save(interaction.guild.id, data);
      return interaction.reply({ content: `✅ ${membre} a été retiré de la liste blanche.`, ephemeral: true });
    }

    if (sub === 'role-ajouter') {
      const role = interaction.options.getRole('role');
      if (!data.config.protection.whitelistRoles.includes(role.id)) {
        data.config.protection.whitelistRoles.push(role.id);
        save(interaction.guild.id, data);
      }
      return interaction.reply({
        content: `✅ Toute personne ayant ${role} est maintenant whitelist automatiquement.`,
        ephemeral: true
      });
    }

    if (sub === 'role-retirer') {
      const role = interaction.options.getRole('role');
      data.config.protection.whitelistRoles = data.config.protection.whitelistRoles.filter(id => id !== role.id);
      save(interaction.guild.id, data);
      return interaction.reply({ content: `✅ ${role} a été retiré de la liste blanche.`, ephemeral: true });
    }

    if (sub === 'voir') {
      const people = data.config.protection.whitelist;
      const roles = data.config.protection.whitelistRoles;
      if (!people.length && !roles.length) return interaction.reply({ content: 'La liste blanche est vide.', ephemeral: true });
      const parts = [];
      if (people.length) parts.push('**Personnes :**\n' + people.map(id => `<@${id}>`).join('\n'));
      if (roles.length) parts.push('**Rôles :**\n' + roles.map(id => `<@&${id}>`).join('\n'));
      return interaction.reply({ content: parts.join('\n\n'), ephemeral: true });
    }
  }
};
