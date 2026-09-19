const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mettre un membre en sourdine (timeout)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Membre à mute').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('Durée en minutes').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(false)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
    const minutes = interaction.options.getInteger('minutes');
    const raison = interaction.options.getString('raison') || 'Non précisée';

    try {
      await target.timeout(minutes * 60 * 1000, raison);
    } catch (err) {
      return interaction.reply({ content: `❌ Impossible de mute ce membre (${err.message}).`, ephemeral: true });
    }

    await target.send(`🔇 Tu as été mis en sourdine ${minutes} minute(s) sur **${interaction.guild.name}**.\nRaison : ${raison}`).catch(() => {});
    await interaction.reply({ content: `✅ ${target} mis en sourdine pour ${minutes} minute(s). Raison : ${raison}` });
  }
};
