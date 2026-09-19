const { isStaff } = require('../permissions');
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { load, save } = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('Sortir un membre du jail et lui rendre ses rôles précédents')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(o => o.setName('membre').setDescription('Membre à sortir du jail').setRequired(true)),
  async execute(interaction) {
    if (!(await isStaff(interaction))) {
      return interaction.reply({ content: "⛔ Tu n'as pas le rôle requis pour utiliser cette commande.", ephemeral: true });
    }
    const data = load(interaction.guild.id);
    const target = interaction.options.getMember('membre');
    if (!target) return interaction.reply({ content: 'Membre introuvable.', ephemeral: true });

    const jailInfo = data.jails[target.id];
    if (!jailInfo) return interaction.reply({ content: `${target} n'est pas en jail.`, ephemeral: true });

    // Ne restaure que les rôles qui existent encore
    const rolesToRestore = jailInfo.removedRoles.filter(id => interaction.guild.roles.cache.has(id));
    await target.roles.set(rolesToRestore).catch(() => {});
    if (data.config.jail.role) await target.roles.remove(data.config.jail.role).catch(() => {});

    delete data.jails[target.id];
    save(interaction.guild.id, data);

    await target.send(`✅ Tu as été sorti du jail sur **${interaction.guild.name}**.`).catch(() => {});

    const embed = new EmbedBuilder()
      .setTitle('✅ Membre sorti du jail')
      .addFields({ name: 'Membre', value: `${target}` }, { name: 'Par', value: `${interaction.user}` })
      .setColor(0x2ecc71)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
