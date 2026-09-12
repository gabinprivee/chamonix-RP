const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { load } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sanction')
    .setDescription('Sanctionner un membre')
    .addUserOption(o => o.setName('membre').setDescription('Membre à sanctionner').setRequired(true)),
  async execute(interaction) {
    const data = load(interaction.guild.id);
    const { requiredRole, types } = data.config.sanction;
    if (!requiredRole) return interaction.reply({ content: "⚠️ Le système de sanction n'est pas configuré.", ephemeral: true });

    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    if (!target.roles.cache.has(requiredRole)) {
      return interaction.reply({
        content: `⚠️ ${target} n'a pas le rôle <@&${requiredRole}> requis et ne peut pas être sanctionné via cette commande.`,
        ephemeral: true
      });
    }
    if (!types.length) {
      return interaction.reply({ content: '⚠️ Aucun type de sanction configuré. Utilise `/sanction-type`.', ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sanction_type_select_${target.id}`)
      .setPlaceholder('Choisir le type de sanction')
      .addOptions(types.map((t, i) => ({ label: t.name, value: String(i) })));
    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({ content: `Sanction pour ${target} :`, components: [row], ephemeral: true });
  }
};
