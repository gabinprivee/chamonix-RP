const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('absence-config')
    .setDescription("Configurer le système d'absence")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon_demande').setDescription('Salon où déclarer une absence').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addChannelOption(o =>
      o
        .setName('salon_validation')
        .setDescription('Salon où arrivent les demandes à valider')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption(o => o.setName('role_validateur').setDescription('Rôle minimum pour valider une absence').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    data.config.absence.requestChannel = interaction.options.getChannel('salon_demande').id;
    data.config.absence.validationChannel = interaction.options.getChannel('salon_validation').id;
    data.config.absence.approverRole = interaction.options.getRole('role_validateur').id;
    save(interaction.guild.id, data);
    await interaction.reply({
      content:
        "✅ Configuration enregistrée. Utilise `/absence-tier` pour définir les rôles selon la durée, puis `/absence-panel` pour poster le bouton.",
      ephemeral: true
    });
  }
};
