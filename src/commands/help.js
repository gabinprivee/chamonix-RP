const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Voir la liste des commandes et systèmes du bot'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 Aide — Commandes du bot')
      .setColor(0x5865f2)
      .addFields(
        { name: '📝 Absences', value: '`/absence-config` `/absence-tier` `/absence-panel`' },
        { name: '🎭 Rôle-réaction', value: '`/reactionrole-setup`' },
        { name: '⬆️ Rankup', value: '`/rankup-config` `/rankup-ladder` `/rankup`' },
        { name: '🕒 Service', value: '`/service-config` `/service-panel` `/service-admin`' },
        { name: '⚠️ Sanctions', value: '`/sanction-config` `/sanction-type` `/sanction`' },
        { name: '⭐ Avis', value: '`/avis-config` `/avis-panel`' },
        { name: '📢 Annonces', value: '`/annonce-config` `/annonce-panel`' }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
