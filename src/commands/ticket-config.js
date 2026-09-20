const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription('Configurer le système de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o =>
      o
        .setName('categorie_tickets')
        .setDescription('Catégorie Discord où les salons de ticket seront créés')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addRoleOption(o => o.setName('role_support').setDescription('Rôle qui voit et gère les tickets').setRequired(true))
    .addChannelOption(o =>
      o.setName('salon_log').setDescription('Salon où les transcripts des tickets fermés sont envoyés').addChannelTypes(ChannelType.GuildText).setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName('intervalle_relance_heures').setDescription('Relance toutes les X heures (défaut : 24)').setMinValue(1).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.tickets.ticketCategoryId = interaction.options.getChannel('categorie_tickets').id;
    data.config.tickets.supportRole = interaction.options.getRole('role_support').id;
    const salonLog = interaction.options.getChannel('salon_log');
    if (salonLog) data.config.tickets.logChannel = salonLog.id;
    const intervalle = interaction.options.getInteger('intervalle_relance_heures');
    if (intervalle) data.config.tickets.reminderHours = intervalle;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        "✅ Configuré. Utilise `/ticket-category ajouter` pour définir les catégories de tickets, puis `/ticket-panel` pour poster le menu.",
      ephemeral: true
    });
  }
};
