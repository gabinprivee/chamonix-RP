const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Mettre un membre en jail (isolement, tous ses rôles sont mémorisés puis retirés)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Membre à jail').setRequired(true))
    .addStringOption(o => o.setName('raison').setDescription('Raison').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    if (!data.config.jail.role) {
      return interaction.reply({ content: "⚠️ Le rôle de jail n'est pas configuré (voir /jail-config).", ephemeral: true });
    }
    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });
    if (data.jails[target.id]) {
      return interaction.reply({ content: `${target} est déjà en jail.`, ephemeral: true });
    }

    // On accuse réception tout de suite : les actions ci-dessous (rôles, MP, log)
    // peuvent prendre plus de 3 secondes et feraient sinon expirer l'interaction.
    await interaction.deferReply();

    const raison = interaction.options.getString('raison');
    const currentRoles = target.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.id);

    data.jails[target.id] = { removedRoles: currentRoles, jailedAt: Date.now(), reason: raison, jailedBy: interaction.user.id };
    save(interaction.guild.id, data);

    await target.roles.remove(currentRoles).catch(() => {});
    await target.roles.add(data.config.jail.role).catch(() => {});
    await target.send(`🔒 Tu as été mis en jail sur **${interaction.guild.name}**.\nRaison : ${raison}`).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('🔒 Membre mis en jail')
      .addFields(
        { name: 'Membre', value: `${target}` },
        { name: 'Raison', value: raison },
        { name: 'Par', value: `${interaction.user}` }
      )
      .setColor(0x992d22)
      .setTimestamp();

    const logChannelId = data.config.jail.logChannel;
    if (logChannelId) {
      const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
      if (logChannel) await logChannel.send({ content: `${target}`, embeds: [embed] }).catch(() => {});
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
