const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod-word')
    .setDescription("Gérer la liste des mots/expressions interdits")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sc =>
      sc.setName('ajouter').setDescription('Ajouter un mot interdit').addStringOption(o => o.setName('mot').setDescription('Mot ou expression').setRequired(true))
    )
    .addSubcommand(sc =>
      sc.setName('retirer').setDescription('Retirer un mot interdit').addStringOption(o => o.setName('mot').setDescription('Mot exact à retirer').setRequired(true))
    )
    .addSubcommand(sc => sc.setName('voir').setDescription('Voir la liste des mots interdits')),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    const sub = interaction.options.getSubcommand();

    if (sub === 'ajouter') {
      const mot = interaction.options.getString('mot');
      if (!data.config.automod.bannedWords.includes(mot)) {
        data.config.automod.bannedWords.push(mot);
        save(interaction.guild.id, data);
      }
      return interaction.reply({ content: `✅ "${mot}" ajouté à la liste des mots interdits.`, ephemeral: true });
    }

    if (sub === 'retirer') {
      const mot = interaction.options.getString('mot');
      data.config.automod.bannedWords = data.config.automod.bannedWords.filter(w => w !== mot);
      save(interaction.guild.id, data);
      return interaction.reply({ content: `✅ "${mot}" retiré.`, ephemeral: true });
    }

    if (sub === 'voir') {
      const words = data.config.automod.bannedWords;
      if (!words.length) return interaction.reply({ content: 'Aucun mot interdit configuré.', ephemeral: true });
      return interaction.reply({ content: words.map(w => `- ${w}`).join('\n'), ephemeral: true });
    }
  }
};
