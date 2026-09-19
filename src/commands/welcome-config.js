const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome-config')
    .setDescription("Configurer les messages de bienvenue et de départ")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où poster les messages').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message_arrivee').setDescription("Message à l'arrivée. Utilise {membre} et {serveur}").setRequired(true)
    )
    .addStringOption(o =>
      o.setName('message_depart').setDescription('Message au départ. Utilise {membre} et {serveur} (optionnel)').setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.welcome.channelId = interaction.options.getChannel('salon').id;
    data.config.welcome.joinMessage = interaction.options.getString('message_arrivee');
    const depart = interaction.options.getString('message_depart');
    if (depart) data.config.welcome.leaveMessage = depart;
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Messages de bienvenue/départ configurés.', ephemeral: true });
  }
};
