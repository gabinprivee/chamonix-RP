const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-category')
    .setDescription('Gérer les catégories de tickets, chacune avec sa propre catégorie Discord et son propre rôle')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc
        .setName('ajouter')
        .setDescription('Ajouter une catégorie de ticket')
        .addStringOption(o => o.setName('nom').setDescription('Nom affiché (ex: Support technique)').setRequired(true))
        .addChannelOption(o =>
          o
            .setName('categorie_discord')
            .setDescription('Catégorie Discord où les salons de CE type de ticket seront créés')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(o => o.setName('role').setDescription('Rôle qui voit et gère CE type de ticket').setRequired(true))
        .addStringOption(o => o.setName('emoji').setDescription('Emoji (optionnel)').setRequired(false))
        .addStringOption(o => o.setName('description').setDescription('Description courte (optionnel)').setRequired(false))
    )
    .addSubcommand(sc =>
      sc
        .setName('retirer')
        .setDescription('Retirer une catégorie de ticket')
        .addStringOption(o => o.setName('nom').setDescription('Nom exact de la catégorie à retirer').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir les catégories configurées')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      const nom = interaction.options.getString('nom');
      const categorieDiscord = interaction.options.getChannel('categorie_discord');
      const role = interaction.options.getRole('role');
      const emoji = interaction.options.getString('emoji');
      const description = interaction.options.getString('description');
      if (data.config.tickets.categories.length >= 25) {
        return interaction.reply({ content: '⚠️ Limite de 25 catégories atteinte (limite Discord du menu).', ephemeral: true });
      }
      data.config.tickets.categories.push({
        label: nom,
        emoji: emoji || null,
        description: description || null,
        discordCategoryId: categorieDiscord.id,
        roleId: role.id
      });
      save(interaction.guild.id, data);
      return interaction.reply({
        content: `✅ Catégorie "${nom}" ajoutée : salons créés dans ${categorieDiscord}, visibles par ${role}.`,
        ephemeral: true
      });
    }

    if (sub === 'retirer') {
      const nom = interaction.options.getString('nom');
      const before = data.config.tickets.categories.length;
      data.config.tickets.categories = data.config.tickets.categories.filter(c => c.label !== nom);
      save(interaction.guild.id, data);
      const removed = before !== data.config.tickets.categories.length;
      return interaction.reply({ content: removed ? `✅ Catégorie "${nom}" retirée.` : `⚠️ Catégorie "${nom}" introuvable.`, ephemeral: true });
    }

    if (sub === 'voir') {
      const categories = data.config.tickets.categories;
      if (!categories.length) return interaction.reply({ content: 'Aucune catégorie configurée.', ephemeral: true });
      const list = categories
        .map((c, i) => `${i + 1}. ${c.emoji || ''} **${c.label}** — salons dans <#${c.discordCategoryId}>, géré par <@&${c.roleId}>${c.description ? `\n   _${c.description}_` : ''}`)
        .join('\n');
      return interaction.reply({ content: list, ephemeral: true });
    }
  }
};
