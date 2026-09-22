const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { load, save } = require('../storage');

const TYPE_KEYS = {
  messages_modifies: 'messageEdit',
  messages_supprimes: 'messageDelete',
  changements_pseudo: 'nickname',
  activite_vocale: 'voice'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlog-config')
    .setDescription('Définir dans quel salon chaque type de journal de modération est envoyé')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o
        .setName('type')
        .setDescription('Quel type de log configurer')
        .setRequired(true)
        .addChoices(
          { name: 'Messages modifiés', value: 'messages_modifies' },
          { name: 'Messages supprimés', value: 'messages_supprimes' },
          { name: 'Changements de pseudo', value: 'changements_pseudo' },
          { name: 'Activité vocale (rejoint/quitte/change)', value: 'activite_vocale' }
        )
    )
    .addBooleanOption(o => o.setName('active').setDescription('Activer ce type de log (false pour le désactiver)').setRequired(true))
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où envoyer ce type de log (requis si actif)').addChannelTypes(ChannelType.GuildText).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const type = interaction.options.getString('type');
    const active = interaction.options.getBoolean('active');
    const salon = interaction.options.getChannel('salon');
    const key = TYPE_KEYS[type];

    if (active && !salon) {
      return interaction.reply({ content: '⚠️ Précise un salon pour activer ce type de log.', ephemeral: true });
    }

    const data = load(interaction.guild.id);
    data.config.modlog[key] = active ? salon.id : null;
    save(interaction.guild.id, data);

    await interaction.reply({
      content: active ? `✅ Ce type de log sera envoyé dans ${salon}.` : '✅ Ce type de log est désactivé.',
      ephemeral: true
    });
  }
};
