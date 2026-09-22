const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod-config')
    .setDescription("Configurer l'auto-modération de contenu (mots interdits, liens d'invitation)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(o => o.setName('active').setDescription('Activer ou désactiver').setRequired(true))
    .addBooleanOption(o => o.setName('bloquer_invitations').setDescription("Supprimer les liens d'invitation Discord").setRequired(true))
    .addChannelOption(o =>
      o.setName('salon_log').setDescription('Salon où arrivent les alertes').addChannelTypes(ChannelType.GuildText).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.automod.enabled = interaction.options.getBoolean('active');
    data.config.automod.blockInvites = interaction.options.getBoolean('bloquer_invitations');
    const salon = interaction.options.getChannel('salon_log');
    if (salon) data.config.automod.logChannel = salon.id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Auto-modération ${data.config.automod.enabled ? 'activée' : 'désactivée'}. Utilise \`/automod-word ajouter\` pour ajouter des mots interdits.`,
      ephemeral: true
    });
  }
};
