const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid-config')
    .setDescription("Régler la détection anti-raid (arrivées massives) et ses réponses automatiques")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(o => o.setName('seuil_arrivees').setDescription("Nombre d'arrivées déclenchant l'alerte").setMinValue(2).setRequired(true))
    .addIntegerOption(o => o.setName('fenetre_secondes').setDescription('Fenêtre de temps en secondes').setMinValue(3).setRequired(true))
    .addBooleanOption(o =>
      o.setName('expulser_comptes_recents').setDescription('Expulser automatiquement les comptes très récents pendant un raid').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('age_min_jours').setDescription("Âge minimum du compte en jours (si l'option ci-dessus est activée)").setMinValue(1).setRequired(false)
    )
    .addBooleanOption(o =>
      o.setName('verrouillage_temporaire').setDescription('Élever temporairement la vérification du serveur pendant un raid').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('duree_verrouillage_minutes').setDescription('Durée du verrouillage en minutes (défaut : 10)').setMinValue(1).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    data.config.protection.raid = {
      thresholdJoins: interaction.options.getInteger('seuil_arrivees'),
      windowSeconds: interaction.options.getInteger('fenetre_secondes'),
      kickNewAccounts: interaction.options.getBoolean('expulser_comptes_recents'),
      newAccountMinDays: interaction.options.getInteger('age_min_jours') || 3,
      tempLockdown: interaction.options.getBoolean('verrouillage_temporaire'),
      lockdownMinutes: interaction.options.getInteger('duree_verrouillage_minutes') || 10
    };
    save(interaction.guild.id, data);
    await interaction.reply({
      content: `✅ Anti-raid réglé. Rappel : la protection doit être active via \`/protection-config\` pour que ces réglages s'appliquent.`,
      ephemeral: true
    });
  }
};
