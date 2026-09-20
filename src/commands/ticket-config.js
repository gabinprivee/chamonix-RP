const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription('Configurer les réglages généraux du système de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o =>
      o
        .setName('salon_log')
        .setDescription('Salon où les transcripts des tickets fermés sont envoyés')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName('intervalle_relance_heures').setDescription('Relance toutes les X heures (défaut : 24)').setMinValue(1).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    const salonLog = interaction.options.getChannel('salon_log');
    if (salonLog) data.config.tickets.logChannel = salonLog.id;
    const intervalle = interaction.options.getInteger('intervalle_relance_heures');
    if (intervalle) data.config.tickets.reminderHours = intervalle;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: '✅ Configuré. Utilise `/ticket-category ajouter` pour créer chaque catégorie avec sa propre catégorie Discord et son propre rôle responsable, puis `/ticket-panel`.',
      ephemeral: true
    });
  }
};
