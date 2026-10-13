const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { CASE_TYPES, getCase, getUserCases, addNote, removeCase, searchCases } = require('../../database/cases');
const { t, getLang } = require('../../utils/i18n');
let theme = null;
try { theme = require('../../utils/theme'); } catch { theme = null; }
const COLORS = theme?.COLORS ?? { primary: 0x5865f2, success: 0x57f287, error: 0xed4245 };
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));
const errEmbed = theme?.err ?? ((t) => new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '')).setTimestamp());
const okEmbed = theme?.ok ?? ((t, d) => new EmbedBuilder().setColor(COLORS.success).setTitle(String(t)).setDescription(String(d ?? '')).setTimestamp());

const TYPE_EMOJI = { warn: '⚠️', kick: '👢', ban: '🚫', timeout: '⏱️', unban: '✅', note: '📝', mute: '🔇' };

function typeChoices() {
  return CASE_TYPES.map((t) => ({ name: t, value: t }));
}

function fmtTime(at, style) {
  const ms = Number(at);
  if (!Number.isFinite(ms) || ms <= 0) return 'n/d';
  return `<t:${Math.floor(ms / 1000)}:${style}>`;
}

function caseLine(c, lang) {
  const emoji = TYPE_EMOJI[c.type] || '📌';
  const reason = truncate(c.reason || t('moderation.noReason', lang), 120);
  return `**#${c.id}** ${emoji} \`${c.type}\` — ${reason}\n<@${c.modId}> • ${fmtTime(c.at, 'R')}`;
}

function detailEmbed(c, interaction, lang) {
  const emoji = TYPE_EMOJI[c.type] || '📌';
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`${emoji} Caso #${c.id} — ${c.type}`.slice(0, 256))
    .addFields(
      { name: t('moderation.caso.user', lang), value: `<@${c.userId}> (${c.userId})`, inline: true },
      { name: t('moderation.caso.moderator', lang), value: `<@${c.modId}>`, inline: true },
      { name: t('moderation.caso.date', lang), value: fmtTime(c.at, 'F'), inline: true },
      { name: t('moderation.caso.reason', lang), value: truncate(c.reason || t('moderation.noReason', lang), 1024) || t('moderation.noReason', lang) }
    )
    .setTimestamp(Number.isFinite(Number(c.at)) ? Number(c.at) : Date.now());
  if (interaction) applyFooter(embed, interaction);
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caso')
    .setDescription('Storico moderazione del server')
    .addSubcommand((s) =>
      s.setName('vedi').setDescription('Vedi un caso tramite ID').addStringOption((o) => o.setName('id').setDescription('ID del caso').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('utente')
        .setDescription("Vedi lo storico di un utente")
        .addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true))
        .addStringOption((o) => o.setName('tipo').setDescription('Filtra per tipo').setRequired(false).addChoices(...typeChoices()))
    )
    .addSubcommand((s) =>
      s
        .setName('nota')
        .setDescription('Aggiungi una nota allo storico di un utente')
        .addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true))
        .addStringOption((o) => o.setName('testo').setDescription('Testo della nota').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('elimina').setDescription('Elimina un caso dallo storico (ManageGuild)').addStringOption((o) => o.setName('id').setDescription('ID del caso').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [errEmbed(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const lang = getLang(interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const ephemeral = (payload) => interaction.reply({ ...payload, flags: MessageFlags.Ephemeral }).catch(() => null);

    if (sub === 'vedi') {
      const c = getCase(interaction.guild.id, interaction.options.getString('id'));
      if (!c) return ephemeral({ embeds: [errEmbed(t('moderation.caso.notFound', lang))] });
      return ephemeral({ embeds: [detailEmbed(c, interaction, lang)] });
    }

    if (sub === 'utente') {
      const user = interaction.options.getUser('utente');
      if (!user) return ephemeral({ embeds: [errEmbed(t('moderation.invalidUser', lang))] });
      const tipo = interaction.options.getString('tipo');
      const all = tipo
        ? searchCases(interaction.guild.id, { userId: user.id, type: tipo, limit: 100 })
        : getUserCases(interaction.guild.id, user.id, 100);
      if (!all.length) {
        return ephemeral({ embeds: [okEmbed(t('moderation.caso.none', lang), t('moderation.caso.noCasesFor', lang, { tag: user.tag ?? user.username, tipo: tipo ? ` di tipo \`${tipo}\`` : '', ttype: tipo ? ` \`${tipo}\`` : '' }))] });
      }
      const shown = all.slice(0, 10);
      const rest = all.length - shown.length;
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(t('moderation.caso.historyOf', lang, { tag: user.tag ?? user.username, n: all.length }).slice(0, 256))
        .setDescription((shown.map((c) => caseLine(c, lang)).join('\n\n') + (rest > 0 ? `\n\n${t('moderation.caso.more', lang, { n: rest })}` : '')).slice(0, 4000))
        .setTimestamp();
      applyFooter(embed, interaction);
      return ephemeral({ embeds: [embed] });
    }

    if (sub === 'nota') {
      const user = interaction.options.getUser('utente');
      if (!user) return ephemeral({ embeds: [errEmbed(t('moderation.invalidUser', lang))] });
      const testo = truncate(interaction.options.getString('testo') || '', 1024);
      if (!testo) return ephemeral({ embeds: [errEmbed(t('moderation.caso.noText', lang))] });
      const c = addNote(interaction.guild.id, { userId: user.id, modId: interaction.user.id, reason: testo });
      if (!c) return ephemeral({ embeds: [errEmbed(t('moderation.caso.saveFailed', lang))] });
      return ephemeral({ embeds: [okEmbed(t('moderation.caso.saved', lang), t('moderation.caso.noteSavedDesc', lang, { tag: user.tag ?? user.username, id: c.id })) ] });
    }

    if (sub === 'elimina') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return ephemeral({ embeds: [errEmbed(t('moderation.caso.needManage', lang))] });
      }
      const id = interaction.options.getString('id');
      const ok = removeCase(interaction.guild.id, id);
      return ephemeral({ embeds: [ok ? okEmbed(t('moderation.caso.deleted', lang), t('moderation.caso.deletedDesc', lang, { id })) : errEmbed(t('moderation.caso.notFoundDesc', lang, { id }))] });
    }

    return ephemeral({ embeds: [errEmbed(t('moderation.caso.unknownSub', lang))] });
  },
};
