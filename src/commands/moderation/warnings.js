const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { getWarnings, clearWarnings, removeWarn } = require('../../database/warnings');
const { hierarchyAllows } = require('../../utils/helpers');
const { t, getLang } = require('../../utils/i18n');

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
const info = theme?.info ?? ((t, d, c = COLORS.primary) =>
  new EmbedBuilder().setColor(c ?? COLORS.primary).setTitle(String(t ?? '').slice(0, 256)).setDescription(String(d ?? '').slice(0, 4000)).setTimestamp()
);
const themeErr = theme?.err ?? ((t) =>
  new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp()
);
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));
const paginate = theme?.paginate ?? (async (interaction, pages) => interaction.reply(pages[0] instanceof EmbedBuilder ? { embeds: [pages[0]] } : pages[0]).catch(() => null));

const PAGE_SIZE = 8;

function formatWarnLine(w, i, lang) {
  const id = typeof w?.id === 'string' && w.id ? w.id : 'sconosciuto';
  const reason = truncate(typeof w?.reason === 'string' && w.reason ? w.reason : t('moderation.noReason', lang), 200);
  const mod = typeof w?.modId === 'string' && w.modId ? `<@${w.modId}>` : 'sconosciuto';
  const when = Number.isFinite(w?.at) ? `<t:${Math.floor(w.at / 1000)}:R>` : 'data sconosciuta';
  return `**${i + 1}.** \`${id}\` — ${reason}\n${mod} • ${when}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("Gestisci gli avvisi di un utente")
    .addSubcommand((s) =>
      s.setName('lista').setDescription("Vedi gli avvisi di un utente").addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('rimuovi').setDescription('Rimuovi un singolo warn tramite ID').addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true)).addStringOption((o) => o.setName('id').setDescription('ID del warn').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('pulisci').setDescription('Rimuovi tutti i warn di un utente').addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [themeErr(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral });
    }
    const lang = getLang(interaction.guildId);
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('utente');
    if (!user) {
      return interaction.reply({ embeds: [themeErr(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral });
    }
    const tag = user.tag ?? user.username ?? user.id;

    if (sub === 'lista') {
      const warns = getWarnings(interaction.guild.id, user.id);
      if (!warns.length) return interaction.reply({ embeds: [ok(t('moderation.warnings.none', lang), t('moderation.warnings.noneFor', lang, { tag: truncate(tag, 100) }))], flags: MessageFlags.Ephemeral });
      const pages = [];
      for (let p = 0; p * PAGE_SIZE < warns.length; p++) {
        const slice = warns.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
        const desc = truncate(slice.map((w, k) => formatWarnLine(w, p * PAGE_SIZE + k, lang)).join('\n\n'), 4000);
        const embed = info(`⚠️ Warn di ${truncate(tag, 100)} (${warns.length})`, desc, COLORS.warn);
        if (warns.length > PAGE_SIZE) embed.setTitle(truncate(`⚠️ Warn di ${tag} (${warns.length}) — pag. ${p + 1}/${Math.ceil(warns.length / PAGE_SIZE)}`, 256));
        applyFooter(embed, interaction);
        pages.push(embed);
      }
      return paginate(interaction, pages).catch(() => null);
    }
    // rimuovi / pulisci: operazioni distruttive, verifica gerarchia se il membro è nel server
    const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ embeds: [themeErr(t('moderation.warnings.owner', lang))], flags: MessageFlags.Ephemeral });
    if (member && !hierarchyAllows(interaction, member))
      return interaction.reply({ embeds: [themeErr(t('moderation.hierarchy', lang))], flags: MessageFlags.Ephemeral });
    if (sub === 'rimuovi') {
      const id = interaction.options.getString('id');
      if (!id) return interaction.reply({ embeds: [themeErr(t('moderation.warnings.badId', lang))], flags: MessageFlags.Ephemeral });
      const done = removeWarn(interaction.guild.id, user.id, id);
      return interaction.reply({
        embeds: [done ? applyFooter(ok(t('moderation.warnings.removed', lang), t('moderation.warnings.removedDesc', lang, { id: truncate(id, 100), tag: truncate(tag, 100) })), interaction) : themeErr(`Warn \`${truncate(id, 100)}\` ${t('moderation.warnings.notFound', lang)}`)],
        flags: MessageFlags.Ephemeral,
      });
    }
    clearWarnings(interaction.guild.id, user.id);
    return interaction.reply({ embeds: [applyFooter(ok(t('moderation.warnings.cleared', lang), t('moderation.warnings.clearedDesc', lang, { tag: truncate(tag, 100) })), interaction)], flags: MessageFlags.Ephemeral });
  },
};
