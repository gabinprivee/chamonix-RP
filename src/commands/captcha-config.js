const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('captcha-config')
    .setDescription('Configurer la vérification captcha pour les nouveaux membres')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(o => o.setName('active').setDescription('Activer ou désactiver').setRequired(true))
    .addRoleOption(o => o.setName('role_verifie').setDescription('Rôle donné une fois la vérification réussie').setRequired(true))
    .addRoleOption(o =>
      o
        .setName('role_non_verifie')
        .setDescription("Rôle donné à l'arrivée et retiré après vérification (optionnel, pour restreindre l'accès avant)")
        .setRequired(false)
    )
    .addChannelOption(o =>
      o
        .setName('salon')
        .setDescription('Salon où poster le captcha (sinon envoyé en message privé)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.captcha.enabled = interaction.options.getBoolean('active');
    data.config.captcha.verifiedRole = interaction.options.getRole('role_verifie').id;
    const nonVerifie = interaction.options.getRole('role_non_verifie');
    data.config.captcha.unverifiedRole = nonVerifie ? nonVerifie.id : null;
    const salon = interaction.options.getChannel('salon');
    data.config.captcha.channelId = salon ? salon.id : null;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Captcha ${data.config.captcha.enabled ? 'activé' : 'désactivé'}.`,
      ephemeral: true
    });
  }
};
