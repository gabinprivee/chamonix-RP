const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bda-config')
    .setDescription('Configurer le système de support vocal (BDA)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o =>
      o
        .setName('salon_attente')
        .setDescription("Salon vocal d'attente à surveiller")
        .addChannelTypes(ChannelType.GuildVoice)
        .setRequired(true)
    )
    .addChannelOption(o =>
      o
        .setName('salon_notification')
        .setDescription('Salon texte où la notification Accepter/Refuser est envoyée')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(o => o.setName('role_notification').setDescription('Rôle à notifier (ping)').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.bda.waitingChannelId = interaction.options.getChannel('salon_attente').id;
    data.config.bda.notifyChannelId = interaction.options.getChannel('salon_notification').id;
    data.config.bda.notifyRoleId = interaction.options.getRole('role_notification').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        "✅ Configuré. Dès qu'un membre rejoint le salon d'attente, une notification arrivera avec Accepter (te déplace le membre dans TON salon vocal actuel) / Refuser (déconnecte le membre).",
      ephemeral: true
    });
  }
};
