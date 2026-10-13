const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  EmbedBuilder, MessageFlags,
} = require('discord.js');
const { getConfig, getTicket, getStats } = require('../../database/tickets');
const { t, getLang } = require('../../utils/i18n');
const { isSupport, doClose, typeLabel, priorityLabel, ticketButtons, buildTypePanel } = require('../../handlers/ticketHandler');

function dashboardMsg(guildId, sezione) {
  const base = (process.env.BASE_URL || '').trim().replace(/\/+$/, '');
  const dest = base ? `${base}/app.html#gid=${guildId}` : 'apri la dashboard del bot';
  return `La configurazione si fa dalla dashboard: ${dest} — sezione ${sezione}`;
}

let theme = null;
try {
  theme = require('../../utils/theme');
} catch {
  theme = null;
}
const COLORS = theme?.COLORS ?? { primary: 0x5865f2, success: 0x57f287, error: 0xed4245, warn: 0xfee75c };
const ok = theme?.ok ?? ((t, d) =>
  new EmbedBuilder().setColor(COLORS.success).setTitle(String(t ?? '').slice(0, 256)).setDescription(String(d ?? '').slice(0, 4000)).setTimestamp()
);
const themeErr = theme?.err ?? ((t) =>
  new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp()
);
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema ticket professionale')
    .addSubcommand((s) =>
      s.setName('setup').setDescription('Configura il sistema ticket (categoria, panel, log, ruoli)')
        .addChannelOption((o) => o.setName('canale-panel').setDescription('Dove pubblicare il pannello').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption((o) => o.setName('categoria').setDescription('Categoria dove creare i ticket').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addRoleOption((o) => o.setName('ruolo-supporto').setDescription('Ruolo staff ticket').setRequired(true))
        .addChannelOption((o) => o.setName('canale-log').setDescription('Dove inviare transcript e chiusure').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addRoleOption((o) => o.setName('ruolo-supporto-2').setDescription('Secondo ruolo staff (opzionale)').setRequired(false))
        .addIntegerOption((o) => o.setName('max-per-utente').setDescription('Max ticket aperti per utente (default 3)').setMinValue(1).setMaxValue(10).setRequired(false))
    )
    .addSubcommand((s) => s.setName('panel').setDescription('Pubblica il pannello ticket con bottoni (staff)')
      .addChannelOption((o) => o.setName('canale').setDescription('Dove pubblicarlo (default: qui)').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addStringOption((o) => o.setName('tipi').setDescription('Tipi separati da virgola (default: tutti)').setRequired(false).setMaxLength(100))
      .addStringOption((o) => o.setName('titolo').setDescription('Titolo del pannello').setRequired(false).setMaxLength(100)))
    .addSubcommand((s) => s.setName('domande-mostra').setDescription('Mostra le domande pre-apertura per tipo')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo di ticket').setRequired(true)
        .addChoices(
          { name: '🛠️ Supporto', value: 'supporto' },
          { name: '🐛 Bug', value: 'bug' },
          { name: '⚖️ Appeal', value: 'appeal' },
          { name: '🤝 Partnership', value: 'partnership' },
        )))
    .addSubcommand((s) => s.setName('domande-imposta').setDescription('Imposta le domande pre-apertura (staff, max 5)')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo di ticket').setRequired(true)
        .addChoices(
          { name: '🛠️ Supporto', value: 'supporto' },
          { name: '🐛 Bug', value: 'bug' },
          { name: '⚖️ Appeal', value: 'appeal' },
          { name: '🤝 Partnership', value: 'partnership' },
        ))
      .addStringOption((o) => o.setName('d1').setDescription('Domanda 1 (obbligatoria)').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('d2').setDescription('Domanda 2').setRequired(false).setMaxLength(200))
      .addStringOption((o) => o.setName('d3').setDescription('Domanda 3').setRequired(false).setMaxLength(200))
      .addStringOption((o) => o.setName('d4').setDescription('Domanda 4').setRequired(false).setMaxLength(200))
      .addStringOption((o) => o.setName('d5').setDescription('Domanda 5').setRequired(false).setMaxLength(200)))
    .addSubcommand((s) => s.setName('domande-reset').setDescription('Rimuove le domande pre-apertura (staff)')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo di ticket').setRequired(true)
        .addChoices(
          { name: '🛠️ Supporto', value: 'supporto' },
          { name: '🐛 Bug', value: 'bug' },
          { name: '⚖️ Appeal', value: 'appeal' },
          { name: '🤝 Partnership', value: 'partnership' },
        )))
    .addSubcommand((s) =>
      s.setName('aggiungi').setDescription('Aggiungi un utente al ticket')
        .addUserOption((o) => o.setName('utente').setDescription('Utente da aggiungere').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('rimuovi').setDescription('Rimuovi un utente dal ticket')
        .addUserOption((o) => o.setName('utente').setDescription('Utente da rimuovere').setRequired(true))
    )
    .addSubcommand((s) => s.setName('claim').setDescription('Prendi in carico questo ticket (staff)'))
    .addSubcommand((s) =>
      s.setName('chiudi').setDescription('Chiudi questo ticket con transcript')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo della chiusura').setRequired(false))
    )
    .addSubcommand((s) => s.setName('riapri').setDescription('Riapri questo ticket (staff)'))
    .addSubcommand((s) => s.setName('transcript').setDescription('Scarica il transcript di questo ticket'))
    .addSubcommand((s) =>
      s.setName('priorita').setDescription('Imposta la priorità del ticket (staff)')
        .addStringOption((o) => o.setName('livello').setDescription('bassa/normale/alta/urgente').setRequired(true)
          .addChoices(
            { name: '🟢 Bassa', value: 'bassa' },
            { name: '🔵 Normale', value: 'normale' },
            { name: '🟠 Alta', value: 'alta' },
            { name: '🔴 Urgente', value: 'urgente' },
          ))
    )
    .addSubcommand((s) =>
      s.setName('assegna').setDescription('Assegna il ticket a uno staffer (staff)')
        .addUserOption((o) => o.setName('staff').setDescription('Staffer assegnatario').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('oggetto').setDescription('Imposta l’oggetto del ticket')
        .addStringOption((o) => o.setName('testo').setDescription('Oggetto (vuoto = rimuovi)').setRequired(false).setMaxLength(120))
    )
    .addSubcommand((s) =>
      s.setName('nota').setDescription('Aggiungi una nota staff al ticket (staff)')
        .addStringOption((o) => o.setName('testo').setDescription('Nota interna (max 500)').setRequired(true).setMaxLength(500))
    )
    .addSubcommand((s) => s.setName('stats').setDescription('Statistiche dei ticket del server'))
    .addSubcommand((s) =>
      s.setName('rinomina').setDescription('Rinomina il canale del ticket')
        .addStringOption((o) => o.setName('nome').setDescription('Nuovo nome (max 80)').setRequired(true).setMaxLength(80))
    )
    .addSubcommand((s) =>
      s.setName('tipo').setDescription('Cambia il tipo del ticket (staff)')
        .addStringOption((o) => o.setName('nuovo').setDescription('Nuovo tipo').setRequired(true)
          .addChoices(
            { name: '🛠️ Supporto', value: 'supporto' },
            { name: '🐛 Bug', value: 'bug' },
            { name: '⚖️ Appeal', value: 'appeal' },
            { name: '🤝 Partnership', value: 'partnership' },
          ))
    )
    .addSubcommand((s) =>
      s.setName('trasferisci').setDescription('Trasferisci la proprietà del ticket (staff)')
        .addUserOption((o) => o.setName('utente').setDescription('Nuovo proprietario').setRequired(true))
    )
    .addSubcommand((s) => s.setName('proteggi').setDescription('Proteggi il ticket da auto-chiusura/eliminazione (staff)'))
    .addSubcommand((s) =>
      s.setName('blacklist').setDescription('Blocca/sblocca utenti dai ticket (staff)')
        .addStringOption((o) => o.setName('azione').setDescription('Aggiungi, rimuovi o lista').setRequired(true)
          .addChoices(
            { name: 'Aggiungi', value: 'aggiungi' },
            { name: 'Rimuovi', value: 'rimuovi' },
            { name: 'Lista', value: 'lista' },
          ))
        .addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName('autoelimina').setDescription('Elimina i ticket chiusi dopo N giorni, 0 = off (staff)')
        .addIntegerOption((o) => o.setName('giorni').setDescription('Giorni (0-90)').setRequired(true).setMinValue(0).setMaxValue(90))
    )
    .addSubcommand((s) =>
      s.setName('sposta').setDescription('Sposta il ticket in un’altra categoria (staff)')
        .addChannelOption((o) => o.setName('categoria').setDescription('Categoria di destinazione').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('tag').setDescription('Risposte rapide staff: usa, crea, lista o rimuovi')
        .addStringOption((o) => o.setName('azione').setDescription('Cosa fare').setRequired(true)
          .addChoices(
            { name: 'Usa (invia nel ticket)', value: 'usa' },
            { name: 'Crea/aggiorna (staff)', value: 'crea' },
            { name: 'Lista', value: 'lista' },
            { name: 'Rimuovi (staff)', value: 'rimuovi' },
          ))
        .addStringOption((o) => o.setName('nome').setDescription('Nome tag').setRequired(false).setMaxLength(32))
        .addStringOption((o) => o.setName('testo').setDescription('Testo (solo per crea)').setRequired(false).setMaxLength(1000))
    )
    .addSubcommand((s) => s.setName('archivio').setDescription('Ultimi ticket chiusi: ritrovali nei log (staff)')),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [themeErr(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral });
    }
    const lang = getLang(interaction.guild.id);
    const sub = interaction.options.getSubcommand();
    const config = getConfig(interaction.guild.id);

    // ---- SETUP e PANEL: solo dalla dashboard ----
    if (sub === 'setup') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [themeErr(t('tickets.needManage', lang))], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: dashboardMsg(interaction.guild.id, 'Ticket'), flags: MessageFlags.Ephemeral });
    }

    // ---- PANEL PRO: pubblica pannello con bottoni per sezione ----
    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [themeErr(t('tickets.needManage', lang))], flags: MessageFlags.Ephemeral });
      }
      const { TICKET_TYPES, savePanel } = require('../../database/tickets');
      const target = interaction.options.getChannel('canale') || interaction.channel;
      if (!target || target.type !== ChannelType.GuildText) {
        return interaction.reply({ embeds: [themeErr(t('tickets.panel.badChannel', lang))], flags: MessageFlags.Ephemeral });
      }
      const rawTipi = (interaction.options.getString('tipi') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      const types = rawTipi.length ? rawTipi.filter((t) => TICKET_TYPES[t]) : Object.keys(TICKET_TYPES);
      if (!types.length) {
        return interaction.reply({ embeds: [themeErr(t('tickets.panel.badTypes', lang, { types: Object.keys(TICKET_TYPES).join(', ') }))], flags: MessageFlags.Ephemeral });
      }
      const titolo = (interaction.options.getString('titolo') || '🎫 Centro Assistenza').slice(0, 100);
      let msg;
      try {
        const payload = buildTypePanel(types, titolo);
        msg = await target.send(payload);
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.panel.cantWrite', lang))], flags: MessageFlags.Ephemeral });
      }
      try {
        savePanel(interaction.guild.id, { channelId: target.id, messageId: msg.id, types, title: titolo });
      } catch (e) {
        return interaction.reply({ embeds: [themeErr(t('tickets.panel.registerFailed', lang))], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ content: t('tickets.panel.published', lang, { channel: `${target}`, n: types.length }), flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    // ---- DOMANDE PRE-APERTURA ----
    if (sub === 'domande-mostra') {
      const { getQuestions } = require('../../database/tickets');
      const tipo = interaction.options.getString('tipo', true);
      const list = getQuestions(interaction.guild.id, tipo);
      if (!list.length) {
        return interaction.reply({ content: t('tickets.panel.noQuestions', lang, { type: typeLabel(tipo) }), flags: MessageFlags.Ephemeral }).catch(() => null);
      }
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`📋 Domande pre-apertura — ${typeLabel(tipo)}`)
        .setDescription(list.map((q, i) => `**${i + 1}.** ${q}${i === 0 ? ' *(obbligatoria)*' : ''}`).join('\n'))
        .setTimestamp();
      applyFooter(embed, interaction);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    if (sub === 'domande-imposta') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [themeErr(t('tickets.needManage', lang))], flags: MessageFlags.Ephemeral });
      }
      const { setQuestions } = require('../../database/tickets');
      const tipo = interaction.options.getString('tipo', true);
      const list = ['d1', 'd2', 'd3', 'd4', 'd5'].map((k) => interaction.options.getString(k) || '').filter((s) => s.trim());
      const saved = setQuestions(interaction.guild.id, tipo, list);
      return interaction.reply({ content: t('tickets.panel.questionsSet', lang, { type: typeLabel(tipo), n: saved.length, list: saved.map((q, i) => `**${i + 1}.** ${q}`).join('\n') }), flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    if (sub === 'domande-reset') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [themeErr(t('tickets.needManage', lang))], flags: MessageFlags.Ephemeral });
      }
      const { setQuestions } = require('../../database/tickets');
      const tipo = interaction.options.getString('tipo', true);
      setQuestions(interaction.guild.id, tipo, []);
      return interaction.reply({ content: t('tickets.panel.questionsReset', lang, { type: typeLabel(tipo) }), flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    // ---- STATS ----
    if (sub === 'stats') {
      const st = getStats(interaction.guild.id);
      const byType = truncate(Object.entries(st.byType).map(([k, v]) => `${typeLabel(k)}: **${v}**`).join('\n') || '—', 1024);
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(t('tickets.statsTitle', lang, { server: truncate(interaction.guild.name, 100) }).slice(0, 256))
        .setTimestamp();
      embed.addFields(
        { name: t('tickets.stats.open', lang), value: `${st.open}`, inline: true },
        { name: t('tickets.stats.closed', lang), value: `${st.closed}`, inline: true },
        { name: t('tickets.stats.total', lang), value: `${st.total}`, inline: true },
        { name: t('tickets.stats.byType', lang), value: byType }
      );
      if (st.avgCloseMin !== null) {
        embed.addFields({ name: t('tickets.stats.avgClose', lang), value: t('tickets.stats.avgCloseUnit', lang, { n: st.avgCloseMin }), inline: true });
      }
      if (st.avgRating !== null) {
        embed.addFields({ name: t('tickets.stats.avgRating', lang), value: t('tickets.stats.avgRatingVal', lang, { n: st.avgRating, c: st.ratingsCount }), inline: true });
      }
      // Classifica staff: chiusure + gradimento.
      try {
        const { getStaffStats } = require('../../database/tickets');
        const top = getStaffStats(interaction.guild.id, 3);
        if (top.length) {
          embed.addFields({
            name: t('tickets.stats.topStaff', lang),
            value: truncate(top.map((s, i) => `${['🥇', '🥈', '🥉'][i] || '•'} <@${s.userId}>: **${s.closed}** ${t('tickets.stats.staffClosed', lang)}${s.avgRating !== null ? ` • ⭐ ${s.avgRating}` : ''}`).join('\n'), 1024),
          });
        }
      } catch {}
      applyFooter(embed, interaction);
      return interaction.reply({ embeds: [embed] });
    }

    // ---- Sotto-comandi dentro un ticket ----
    const ticket = getTicket(interaction.guild.id, interaction.channelId);
    if (!ticket) {
      return interaction.reply({ embeds: [themeErr(t('tickets.needTicketChannel', lang))], flags: MessageFlags.Ephemeral });
    }
    const staff = isSupport(interaction.member, config);

    if (sub === 'aggiungi' || sub === 'rimuovi') {
      const user = interaction.options.getUser('utente');
      if (!user) return interaction.reply({ embeds: [themeErr(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral });
      const allowed = staff || ticket.ownerId === interaction.user.id;
      if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.ownerOrStaff', lang))], flags: MessageFlags.Ephemeral });
      if (user.id === ticket.ownerId) return interaction.reply({ embeds: [themeErr(t('tickets.member.isOwner', lang))], flags: MessageFlags.Ephemeral });
      try {
        if (sub === 'aggiungi') {
          await interaction.channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
          });
          return interaction.reply({ embeds: [applyFooter(ok(t('tickets.member.added', lang), t('tickets.member.addedDesc', lang, { user: `${user}`, n: ticket.number })), interaction)] });
        }
        await interaction.channel.permissionOverwrites.delete(user.id);
        return interaction.reply({ embeds: [applyFooter(ok(t('tickets.member.removed', lang), t('tickets.member.removedDesc', lang, { user: `${user}`, n: ticket.number })), interaction)] });
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.member.channelPermError', lang))], flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'claim') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      if (ticket.status !== 'open') return interaction.reply({ embeds: [themeErr(t('tickets.alreadyClosed', lang))], flags: MessageFlags.Ephemeral });
      const { saveTicket } = require('../../database/tickets');
      ticket.claimedBy = ticket.claimedBy === interaction.user.id ? null : interaction.user.id;
      saveTicket(interaction.guild.id, ticket);
      return interaction.reply({
        embeds: [applyFooter(ok(t('tickets.claim.taken', lang), ticket.claimedBy ? t('tickets.claim.takenDesc', lang, { n: ticket.number, user: `${interaction.user}` }) : t('tickets.claim.releasedDesc', lang, { user: `${interaction.user}`, n: ticket.number })), interaction)],
      });
    }

    if (sub === 'chiudi') {
      const allowed = staff || ticket.ownerId === interaction.user.id;
      if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.ownerOrStaff', lang))], flags: MessageFlags.Ephemeral });
      if (ticket.status !== 'open') return interaction.reply({ embeds: [themeErr(t('tickets.alreadyClosed', lang))], flags: MessageFlags.Ephemeral });
      const reason = (interaction.options.getString('motivo') || 'Chiuso via comando').slice(0, 500);
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      if (!interaction.deferred && !interaction.replied) {
        return;
      }
      let closed = false;
      try {
        closed = await doClose(interaction.channel, interaction.guild, ticket, interaction.user, reason);
      } catch {
        return interaction.editReply({ embeds: [themeErr(t('tickets.close.failed', lang))] }).catch(() => {});
      }
      return interaction.editReply(closed ? { embeds: [ok(t('tickets.close.done', lang), t('tickets.close.doneDesc', lang))] } : { embeds: [themeErr(t('tickets.alreadyClosed', lang))] }).catch(() => {});
    }

    if (sub === 'riapri') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      if (ticket.status !== 'closed') return interaction.reply({ embeds: [themeErr(t('tickets.alreadyOpen', lang))], flags: MessageFlags.Ephemeral });
      const { saveTicket } = require('../../database/tickets');
      ticket.status = 'open';
      ticket.closedAt = null;
      saveTicket(interaction.guild.id, ticket);
      try {
        await interaction.channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: true });
        if (interaction.channel.name.startsWith('closed-')) {
          await interaction.channel.setName(interaction.channel.name.replace(/^closed-/, '').slice(0, 100));
        }
      } catch {}
      return interaction.reply({ embeds: [applyFooter(ok(t('tickets.reopen.done', lang), t('tickets.reopen.doneDesc', lang, { n: ticket.number })), interaction)], components: ticketButtons(false) });
    }

    if (sub === 'priorita') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      if (ticket.status !== 'open') return interaction.reply({ embeds: [themeErr(t('tickets.alreadyClosed', lang))], flags: MessageFlags.Ephemeral });
      const livello = interaction.options.getString('livello', true);
      const { setPriority } = require('../../database/tickets');
      try {
        setPriority(interaction.guild.id, interaction.channelId, livello);
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.priority.invalid', lang))], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ embeds: [applyFooter(ok(t('tickets.priority.done', lang), t('tickets.priority.doneDesc', lang, { n: ticket.number, label: priorityLabel(livello) })), interaction)] });
    }

    if (sub === 'assegna') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      if (ticket.status !== 'open') return interaction.reply({ embeds: [themeErr(t('tickets.alreadyClosed', lang))], flags: MessageFlags.Ephemeral });
      const target = interaction.options.getUser('staff');
      if (!target || target.bot) return interaction.reply({ embeds: [themeErr(t('tickets.assign.badStaff', lang))], flags: MessageFlags.Ephemeral });
      const { saveTicket } = require('../../database/tickets');
      ticket.claimedBy = target.id;
      saveTicket(interaction.guild.id, ticket);
      return interaction.reply({ embeds: [applyFooter(ok(t('tickets.assign.done', lang), t('tickets.assign.doneDesc', lang, { n: ticket.number, user: `${target}` })), interaction)] });
    }

    if (sub === 'oggetto') {
      const allowed = staff || ticket.ownerId === interaction.user.id;
      if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.ownerOrStaff', lang))], flags: MessageFlags.Ephemeral });
      const testo = (interaction.options.getString('testo') || '').trim();
      const { setSubject } = require('../../database/tickets');
      setSubject(interaction.guild.id, interaction.channelId, testo);
      try {
        const topic = `Ticket #${ticket.number} | owner ${ticket.ownerId} | tipo ${ticket.type}${testo ? ` | ${testo.slice(0, 80)}` : ''}`;
        await interaction.channel.setTopic(topic.slice(0, 1024)).catch(() => null);
      } catch {}
      return interaction.reply({
        embeds: [applyFooter(ok(t('tickets.subject.done', lang), testo ? t('tickets.subject.doneDesc', lang, { n: ticket.number, text: truncate(testo, 120) }) : t('tickets.subject.removedDesc', lang, { n: ticket.number })), interaction)],
      });
    }

    if (sub === 'nota') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const testo = interaction.options.getString('testo', true);
      const { addNote } = require('../../database/tickets');
      try {
        const t = addNote(interaction.guild.id, interaction.channelId, interaction.user.tag, testo);
        return interaction.reply({ embeds: [applyFooter(ok(t('tickets.note.done', lang), t('tickets.note.doneDesc', lang, { n: (t.notes || []).length, t: ticket.number })), interaction)] });
      } catch (e) {
        return interaction.reply({ embeds: [themeErr(t('tickets.note.invalid', lang))], flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'transcript') {
      const allowed = staff || ticket.ownerId === interaction.user.id;
      if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.transcript.noAccess', lang))], flags: MessageFlags.Ephemeral });
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      if (!interaction.deferred && !interaction.replied) {
        return;
      }
      let file = null;
      try {
        const { ticketTranscript } = require('../../handlers/ticketHandler');
        file = await ticketTranscript(interaction.channel, ticket);
      } catch {
        return interaction.editReply({ embeds: [themeErr(t('tickets.transcript.failed', lang))] }).catch(() => {});
      }
      if (!file) {
        return interaction.editReply({ embeds: [themeErr(t('tickets.transcript.failed', lang))] }).catch(() => {});
      }
      return interaction.editReply({ content: t('tickets.transcript.caption', lang, { n: ticket.number }), files: [file] }).catch(() => {});
    }

    if (sub === 'rinomina') {
      const allowed = staff || ticket.ownerId === interaction.user.id;
      if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.ownerOrStaff', lang))], flags: MessageFlags.Ephemeral });
      const nome = interaction.options.getString('nome', true).toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `ticket-${ticket.number}`;
      try {
        await interaction.channel.setName(nome);
        return interaction.reply({ embeds: [applyFooter(ok(t('tickets.rename.done', lang), t('tickets.rename.doneDesc', lang, { name: nome })), interaction)] });
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.rename.failed', lang))], flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'tipo') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const nuovo = interaction.options.getString('nuovo', true);
      const { setTicketType } = require('../../database/tickets');
      try {
        setTicketType(interaction.guild.id, interaction.channelId, nuovo);
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.type.invalid', lang))], flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({ embeds: [applyFooter(ok(t('tickets.type.done', lang), t('tickets.type.doneDesc', lang, { n: ticket.number, type: typeLabel(nuovo) })), interaction)] });
    }

    if (sub === 'trasferisci') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const target = interaction.options.getUser('utente');
      if (!target || target.bot) return interaction.reply({ embeds: [themeErr(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral });
      if (target.id === ticket.ownerId) return interaction.reply({ embeds: [themeErr(t('tickets.transfer.alreadyOwner', lang))], flags: MessageFlags.Ephemeral });
      const { transferTicket } = require('../../database/tickets');
      try {
        transferTicket(interaction.guild.id, interaction.channelId, target.id);
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.transfer.failed', lang))], flags: MessageFlags.Ephemeral });
      }
      try {
        await interaction.channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        await interaction.channel.permissionOverwrites.delete(ticket.ownerId).catch(() => null);
      } catch {}
      try {
        const topic = `Ticket #${ticket.number} | owner ${target.id} | tipo ${ticket.type}`;
        await interaction.channel.setTopic(topic.slice(0, 1024)).catch(() => null);
      } catch {}
      return interaction.reply({ embeds: [applyFooter(ok(t('tickets.transfer.done', lang), t('tickets.transfer.doneDesc', lang, { n: ticket.number, user: `${target}` })), interaction)] });
    }

    if (sub === 'proteggi') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const { setPinned } = require('../../database/tickets');
      const updated = setPinned(interaction.guild.id, interaction.channelId, !ticket.pinned);
      if (!updated) return interaction.reply({ embeds: [themeErr(t('tickets.protect.notFound', lang))], flags: MessageFlags.Ephemeral });
      return interaction.reply({
        embeds: [applyFooter(ok(updated.pinned ? t('tickets.protect.on', lang) : t('tickets.protect.off', lang),
          updated.pinned ? t('tickets.protect.onDesc', lang, { n: ticket.number }) : t('tickets.protect.offDesc', lang, { n: ticket.number })), interaction)],
      });
    }

    if (sub === 'blacklist') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const { setBlacklisted, getConfig: getTConfig } = require('../../database/tickets');
      const azione = interaction.options.getString('azione', true);
      if (azione === 'lista') {
        const bl = getTConfig(interaction.guild.id).blacklist || [];
        return interaction.reply({
          content: bl.length ? `⛔ Blacklist ticket (${bl.length}):\n${bl.map((id) => `• <@${id}>`).join('\n').slice(0, 3500)}` : t('tickets.blacklist.empty', lang),
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
      }
      const target = interaction.options.getUser('utente');
      if (!target) return interaction.reply({ embeds: [themeErr(t('tickets.blacklist.needUser', lang))], flags: MessageFlags.Ephemeral });
      if (target.bot) return interaction.reply({ embeds: [themeErr(t('tickets.blacklist.isBot', lang))], flags: MessageFlags.Ephemeral });
      try {
        const changed = setBlacklisted(interaction.guild.id, target.id, azione === 'aggiungi');
        return interaction.reply({
          content: azione === 'aggiungi'
            ? (changed ? t('tickets.blacklist.added', lang, { user: `${target}` }) : t('tickets.blacklist.alreadyListed', lang, { user: `${target}` }))
            : (changed ? t('tickets.blacklist.removed', lang, { user: `${target}` }) : t('tickets.blacklist.notListed', lang, { user: `${target}` })),
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
      } catch (e) {
        return interaction.reply({ embeds: [themeErr(t('tickets.blacklist.failed', lang))], flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'autoelimina') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ embeds: [themeErr(t('tickets.needManage', lang))], flags: MessageFlags.Ephemeral });
      }
      const giorni = interaction.options.getInteger('giorni', true);
      const { setConfig } = require('../../database/tickets');
      setConfig(interaction.guild.id, { autoDeleteDays: giorni });
      return interaction.reply({
        content: giorni > 0 ? t('tickets.autodelete.on', lang, { n: giorni }) : t('tickets.autodelete.off', lang),
        flags: MessageFlags.Ephemeral,
      }).catch(() => null);
    }

    if (sub === 'sposta') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const categoria = interaction.options.getChannel('categoria');
      if (!categoria || categoria.type !== ChannelType.GuildCategory) {
        return interaction.reply({ embeds: [themeErr(t('tickets.move.badCategory', lang))], flags: MessageFlags.Ephemeral });
      }
      try {
        await interaction.channel.setParent(categoria.id, { lockPermissions: false });
        return interaction.reply({ embeds: [applyFooter(ok(t('tickets.move.done', lang), t('tickets.move.doneDesc', lang, { n: ticket.number, cat: categoria.name })), interaction)] });
      } catch {
        return interaction.reply({ embeds: [themeErr(t('tickets.move.failed', lang))], flags: MessageFlags.Ephemeral });
      }
    }

    if (sub === 'tag') {
      const { getTag, listTags, setTag, removeTag } = require('../../database/tickets');
      const azione = interaction.options.getString('azione', true);
      if (azione === 'lista') {
        const tags = listTags(interaction.guild.id);
        if (!tags.length) {
          return interaction.reply({ content: t('tickets.tag.empty', lang), flags: MessageFlags.Ephemeral }).catch(() => null);
        }
        const embed = new EmbedBuilder()
          .setColor(COLORS.primary)
          .setTitle(`🏷️ Tag risposte rapide (${tags.length})`)
          .setDescription(truncate(tags.map((t) => `**${t.name}** — ${t.text.slice(0, 80)}`).join('\n'), 4000))
          .setTimestamp();
        applyFooter(embed, interaction);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
      }
      if (azione === 'usa') {
        const nome = (interaction.options.getString('nome') || '').toLowerCase().trim();
        const text = nome ? getTag(interaction.guild.id, nome) : null;
        if (!text) {
          return interaction.reply({ embeds: [themeErr(t('tickets.tag.notFound', lang))], flags: MessageFlags.Ephemeral });
        }
        const allowed = staff || ticket.ownerId === interaction.user.id;
        if (!allowed) return interaction.reply({ embeds: [themeErr(t('tickets.ownerOrStaff', lang))], flags: MessageFlags.Ephemeral });
        try {
          await interaction.channel.send(`🏷️ **${nome}**\n${text.slice(0, 1800)}`);
          return interaction.reply({ content: t('tickets.tag.sent', lang, { name: nome }), flags: MessageFlags.Ephemeral }).catch(() => null);
        } catch {
          return interaction.reply({ embeds: [themeErr(t('tickets.tag.cantWrite', lang))], flags: MessageFlags.Ephemeral });
        }
      }
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const nome = interaction.options.getString('nome');
      if (!nome) return interaction.reply({ embeds: [themeErr(t('tickets.tag.needName', lang))], flags: MessageFlags.Ephemeral });
      if (azione === 'crea') {
        const testo = interaction.options.getString('testo');
        if (!testo) return interaction.reply({ embeds: [themeErr(t('tickets.tag.needText', lang))], flags: MessageFlags.Ephemeral });
        try {
          const saved = setTag(interaction.guild.id, nome, testo);
          return interaction.reply({ content: t('tickets.tag.saved', lang, { name: saved.name, n: saved.text.length }), flags: MessageFlags.Ephemeral }).catch(() => null);
        } catch (e) {
          return interaction.reply({ embeds: [themeErr(t('tickets.tag.invalid', lang))], flags: MessageFlags.Ephemeral });
        }
      }
      const okRm = removeTag(interaction.guild.id, nome);
      return interaction.reply({ content: okRm ? t('tickets.tag.removed', lang, { name: nome.toLowerCase().trim() }) : t('tickets.tag.notFound', lang), flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    if (sub === 'archivio') {
      if (!staff) return interaction.reply({ embeds: [themeErr(t('tickets.onlyStaff', lang))], flags: MessageFlags.Ephemeral });
      const { recentClosed } = require('../../database/tickets');
      const closed = recentClosed(interaction.guild.id, 10);
      if (!closed.length) {
        return interaction.reply({ content: t('tickets.archive.empty', lang), flags: MessageFlags.Ephemeral }).catch(() => null);
      }
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(t('tickets.archive.title', lang, { n: closed.length }))
        .setDescription(truncate(closed.map((t) => {
          const when = Number.isFinite(t.closedAt) ? `<t:${Math.floor(t.closedAt / 1000)}:d>` : '—';
          const star = t.rating && t.rating.score ? ` • ⭐${t.rating.score}` : '';
          return `**#${t.number}** ${typeLabel(t.type)} — <@${t.ownerId}> • ${when}${star}${t.closeReason ? `\n_${truncate(t.closeReason, 80)}_` : ''}`;
        }).join('\n\n'), 4000))
        .setFooter({ text: t('tickets.archive.footer', lang) })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  },
};
