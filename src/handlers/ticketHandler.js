const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  ChannelType
} = require('discord.js');
const { load, save } = require('../storage');

function buildPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('🎫 Support')
    .setDescription('Choisis une catégorie ci-dessous pour ouvrir un ticket.')
    .setColor(0x5865f2);
}

function buildPanelRow(data) {
  const categories = data.config.tickets.categories;
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('Choisir une catégorie...')
    .addOptions(
      categories.map((c, i) => ({
        label: c.label,
        value: String(i),
        emoji: c.emoji || undefined,
        description: c.description || undefined
      }))
    );
  return new ActionRowBuilder().addComponents(menu);
}

function sanitizeName(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);
}

async function openTicket(interaction) {
  const data = load(interaction.guild.id);
  const tickets = data.config.tickets;
  const categoryIndex = Number(interaction.values[0]);
  const category = tickets.categories[categoryIndex];
  if (!category) return interaction.reply({ content: '⚠️ Catégorie introuvable.', ephemeral: true });

  if (!category.discordCategoryId || !category.roleId) {
    return interaction.reply({
      content: "⚠️ Cette catégorie de ticket est mal configurée (catégorie Discord ou rôle manquant). Préviens un admin.",
      ephemeral: true
    });
  }

  const alreadyOpen = Object.values(data.tickets).find(t => t.openerId === interaction.user.id && t.status === 'open');
  if (alreadyOpen) {
    return interaction.reply({ content: `⚠️ Tu as déjà un ticket ouvert : <#${alreadyOpen.channelId}>.`, ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  tickets.counter += 1;
  const number = tickets.counter;
  const channelName = `ticket-${number}-${sanitizeName(interaction.user.username)}`;

  const channel = await interaction.guild.channels
    .create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.discordCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: category.roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels
          ]
        }
      ]
    })
    .catch(() => null);

  if (!channel) {
    return interaction.editReply({
      content: "❌ Impossible de créer le salon du ticket (vérifie que le bot a la permission Gérer les salons, et que sa catégorie Discord n'a pas atteint la limite de 50 salons)."
    });
  }

  data.tickets[channel.id] = {
    number,
    openerId: interaction.user.id,
    category: category.label,
    roleId: category.roleId,
    status: 'open',
    assignedTo: null,
    createdAt: Date.now(),
    lastStaffReplyAt: null,
    lastReminderAt: null
  };
  save(interaction.guild.id, data);

  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${number} — ${category.label}`)
    .setDescription(`Bienvenue ${interaction.user} !\nUn membre de <@&${category.roleId}> va s'occuper de toi. Décris ton problème ci-dessous.`)
    .setColor(0x5865f2)
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: `${interaction.user} <@&${category.roleId}>`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ticket créé : ${channel}` });
}

async function assignIfStaffReply(message) {
  const data = load(message.guild.id);
  const ticket = data.tickets[message.channel.id];
  if (!ticket || ticket.status !== 'open') return;

  if (message.author.id === ticket.openerId) return;
  if (ticket.assignedTo) {
    if (message.author.id === ticket.assignedTo) {
      ticket.lastStaffReplyAt = Date.now();
      save(message.guild.id, data);
    }
    return;
  }

  const member = message.member;
  if (!member || !ticket.roleId || !member.roles.cache.has(ticket.roleId)) return;

  ticket.assignedTo = message.author.id;
  ticket.lastStaffReplyAt = Date.now();
  save(message.guild.id, data);

  await message.channel.send(`🎫 Ce ticket est maintenant pris en charge par ${message.author}.`).catch(() => {});
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;
  const sorted = Array.from(messages.values()).reverse();
  const lines = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString('fr-FR');
    const content = m.content || '[pas de texte — embed/fichier]';
    return `[${time}] ${m.author.tag}: ${content}`;
  });
  return lines.join('\n');
}

async function closeTicket(interaction) {
  const data = load(interaction.guild.id);
  const ticket = data.tickets[interaction.channel.id];
  if (!ticket) return interaction.reply({ content: "⚠️ Ce salon n'est pas un ticket géré par le bot.", ephemeral: true });
  if (ticket.status === 'closed') return interaction.reply({ content: 'Ce ticket est déjà fermé.', ephemeral: true });

  await interaction.deferReply();

  ticket.status = 'closed';
  ticket.closedAt = Date.now();
  ticket.closedBy = interaction.user.id;
  save(interaction.guild.id, data);

  const transcript = await buildTranscript(interaction.channel);
  const logChannelId = data.config.tickets.logChannel;
  if (logChannelId && transcript) {
    const logChannel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
    if (logChannel) {
      const durationMin = Math.round((ticket.closedAt - ticket.createdAt) / 60000);
      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket #${ticket.number} fermé`)
        .addFields(
          { name: 'Ouvert par', value: `<@${ticket.openerId}>`, inline: true },
          { name: 'Catégorie', value: ticket.category, inline: true },
          { name: 'Assigné à', value: ticket.assignedTo ? `<@${ticket.assignedTo}>` : 'Personne', inline: true },
          { name: 'Fermé par', value: `${interaction.user}`, inline: true },
          { name: 'Durée', value: `${durationMin} min`, inline: true }
        )
        .setColor(0x992d22)
        .setTimestamp();
      const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf8'), { name: `ticket-${ticket.number}-transcript.txt` });
      await logChannel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
    }
  }

  await interaction.editReply({ content: '🔒 Ticket fermé. Ce salon sera supprimé dans 10 secondes.' });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
}

async function checkReminders(guild, data) {
  const { reminderHours } = data.config.tickets;
  const intervalMs = (reminderHours || 24) * 60 * 60 * 1000;
  const now = Date.now();
  let changed = false;

  for (const [channelId, ticket] of Object.entries(data.tickets)) {
    if (ticket.status !== 'open') continue;
    const reference = ticket.lastReminderAt || ticket.lastStaffReplyAt || ticket.createdAt;
    if (now - reference < intervalMs) continue;

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) continue;

    const mention = ticket.assignedTo ? `<@${ticket.assignedTo}>` : `<@&${ticket.roleId}>`;
    await channel
      .send(`⏰ ${mention} Ce ticket est ouvert depuis un moment sans mise à jour. Peut-on le fermer, ou faut-il continuer ?`)
      .catch(() => {});

    ticket.lastReminderAt = now;
    changed = true;
  }

  if (changed) save(guild.id, data);
}

module.exports = { buildPanelEmbed, buildPanelRow, openTicket, assignIfStaffReply, closeTicket, checkReminders };
