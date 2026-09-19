const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispam-config')
    .setDescription('Régler les seuils de détection du spam (mentions et flood de messages)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(o =>
      o.setName('max_mentions').setDescription('Nombre de mentions dans un seul message avant sanction').setMinValue(2).setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('max_messages').setDescription("Nombre de messages avant sanction (flood)").setMinValue(2).setRequired(true)
    )
    .addIntegerOption(o =>
      o
        .setName('intervalle_secondes')
        .setDescription('Fenêtre de temps (en secondes) pour compter le flood de messages')
        .setMinValue(1)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.protection.antiSpam.maxMentions = interaction.options.getInteger('max_mentions');
    data.config.protection.antiSpam.maxMessages = interaction.options.getInteger('max_messages');
    data.config.protection.antiSpam.intervalSeconds = interaction.options.getInteger('intervalle_secondes');
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Anti-spam réglé : ${data.config.protection.antiSpam.maxMentions} mentions max par message, ${data.config.protection.antiSpam.maxMessages} messages max en ${data.config.protection.antiSpam.intervalSeconds}s.\n⚠️ Rappelle-toi que l'anti-spam ne fonctionne que si \`/protection-config\` est activé.`,
      ephemeral: true
    });
  }
};
