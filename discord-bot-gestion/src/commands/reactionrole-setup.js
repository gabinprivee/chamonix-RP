const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole-setup')
    .setDescription('Créer un message rôle-réaction')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(o =>
      o.setName('salon').setDescription('Salon où poster le message').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addStringOption(o => o.setName('titre').setDescription('Titre du message').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description du message').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji sur lequel réagir').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Rôle à donner en réagissant').setRequired(true))
    .addRoleOption(o =>
      o.setName('role_exclu').setDescription("Rôle qui n'obtient PAS le rôle mais reçoit un lien en MP (ex: staff)").setRequired(false)
    )
    .addStringOption(o =>
      o.setName('lien').setDescription('Lien envoyé en MP aux personnes ayant le rôle exclu').setRequired(false)
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('salon');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    const excludedRole = interaction.options.getRole('role_exclu');
    const link = interaction.options.getString('lien');

    const embed = new EmbedBuilder()
      .setTitle(interaction.options.getString('titre'))
      .setDescription(interaction.options.getString('description'))
      .setColor(0x5865f2);
    const message = await channel.send({ embeds: [embed] });
    await message.react(emoji).catch(() => {});

    const data = load(interaction.guild.id);
    data.config.reactionRole = {
      channelId: channel.id,
      messageId: message.id,
      emoji,
      roleId: role.id,
      excludedRoleId: excludedRole ? excludedRole.id : null,
      link: link || null
    };
    save(interaction.guild.id, data);
    await interaction.reply({ content: '✅ Message rôle-réaction créé.', ephemeral: true });
  }
};
