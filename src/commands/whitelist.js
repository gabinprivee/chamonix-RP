const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription("Gérer la liste blanche de la protection anti-nuke")
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
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la liste blanche actuelle')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

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

    if (sub === 'voir') {
      const list = data.config.protection.whitelist;
      if (!list.length) return interaction.reply({ content: 'La liste blanche est vide.', ephemeral: true });
      return interaction.reply({ content: list.map(id => `<@${id}>`).join('\n'), ephemeral: true });
    }
  }
};
