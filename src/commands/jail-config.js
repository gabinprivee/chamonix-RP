const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jail-config')
    .setDescription('Configurer le système de jail')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(o =>
      o
        .setName('role_jail')
        .setDescription("Rôle isolant le membre (configure ses permissions sur les salons toi-même)")
        .setRequired(true)
    )
    .addChannelOption(o =>
      o.setName('salon_log').setDescription('Salon où sont annoncées les mises en jail').addChannelTypes(ChannelType.GuildText).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.jail.role = interaction.options.getRole('role_jail').id;
    const salon = interaction.options.getChannel('salon_log');
    if (salon) data.config.jail.logChannel = salon.id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        "✅ Configuré. N'oublie pas de configurer toi-même les permissions du rôle jail sur tes salons (accès refusé partout sauf un éventuel salon de jail).",
      ephemeral: true
    });
  }
};
