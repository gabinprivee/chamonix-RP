const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('protection-config')
    .setDescription("Configurer la protection anti-nuke (whitelist requise pour les actions sensibles)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o =>
      o.setName('salon_log').setDescription('Salon où arrivent les alertes').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption(o =>
      o
        .setName('action')
        .setDescription("Sanction appliquée à quelqu'un qui n'est pas whitelist")
        .setRequired(true)
        .addChoices(
          { name: 'Retirer tous les rôles + mise en sourdine 24h', value: 'strip_roles' },
          { name: 'Expulser (kick)', value: 'kick' },
          { name: 'Bannir', value: 'ban' }
        )
    )
    .addBooleanOption(o => o.setName('active').setDescription('Activer ou désactiver la protection').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    data.config.protection.logChannel = interaction.options.getChannel('salon_log').id;
    data.config.protection.punishment = interaction.options.getString('action');
    data.config.protection.enabled = interaction.options.getBoolean('active');
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Protection ${data.config.protection.enabled ? 'activée' : 'désactivée'}. Utilise \`/whitelist ajouter\` pour autoriser les personnes de confiance à effectuer des actions sensibles.`,
      ephemeral: true
    });
  }
};
