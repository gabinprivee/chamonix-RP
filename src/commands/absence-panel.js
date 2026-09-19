const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { load } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('absence-panel')
    .setDescription("Poster le panneau de déclaration d'absence")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    if (!(await isStaff(interaction))) return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });

    const data = load(interaction.guild.id);
    const { requestChannel } = data.config.absence;
    if (!requestChannel) return interaction.reply({ content: "⚠️ Configure d'abord `/absence-config`.", ephemeral: true });
    const channel = await interaction.guild.channels.fetch(requestChannel).catch(() => null);
    if (!channel) return interaction.reply({ content: '⚠️ Salon de demande introuvable.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('📝 Absences')
      .setDescription('Cliquez ci-dessous pour déclarer une absence (date de départ, date de retour, raison).')
      .setColor(0x5865f2);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('absence_declare').setLabel('Déclarer une absence').setStyle(ButtonStyle.Primary)
    );
    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Panneau posté.', ephemeral: true });
  }
};
