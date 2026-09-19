const { SlashCommandBuilder } = require('discord.js');
const { load } = require('../storage');
const { hasRoleAtOrAbove } = require('../permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankup')
    .setDescription('Promouvoir un membre au grade supérieur')
    .addUserOption(o => o.setName('membre').setDescription('Membre à promouvoir').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    const { thresholdRole, ladder } = data.config.rankup;

    if (!hasRoleAtOrAbove(interaction.member, thresholdRole)) {
      return interaction.reply({ content: "⛔ Tu n'as pas la permission d'utiliser cette commande.", ephemeral: true });
    }
    if (!ladder.length) {
      return interaction.reply({ content: '⚠️ Aucune hiérarchie configurée (voir /rankup-ladder).', ephemeral: true });
    }

    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    const currentIndex = ladder.reduce((found, roleId, i) => (target.roles.cache.has(roleId) ? i : found), -1);

    if (currentIndex === -1) {
      await target.roles.add(ladder[0]).catch(() => {});
      return interaction.reply({ content: `✅ ${target} a reçu le grade <@&${ladder[0]}>.` });
    }
    if (currentIndex === ladder.length - 1) {
      return interaction.reply({ content: `${target} a déjà le grade le plus élevé.`, ephemeral: true });
    }

    await target.roles.remove(ladder[currentIndex]).catch(() => {});
    await target.roles.add(ladder[currentIndex + 1]).catch(() => {});
    return interaction.reply({
      content: `✅ ${target} passe de <@&${ladder[currentIndex]}> à <@&${ladder[currentIndex + 1]}> !`
    });
  }
};
