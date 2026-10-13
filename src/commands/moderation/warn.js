const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { addWarn, getWarnings, getWarnActions, actionFor } = require('../../database/warnings');
const { t, getLang } = require('../../utils/i18n');
const { sendLog, hierarchyAllows } = require('../../utils/helpers');
const { logCase } = require('../../database/cases');

let theme = null;
try {
  theme = require('../../utils/theme');
} catch {
  theme = null;
}
const COLORS = theme?.COLORS ?? { primary: 0x5865f2, success: 0x57f287, error: 0xed4245, warn: 0xfee75c };
const themeErr = theme?.err ?? ((t) =>
  new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp()
);
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avvisa un utente (azioni automatiche a soglia, vedi /warnazioni)')
    .addUserOption((o) => o.setName('utente').setDescription('Utente da avvisare').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [themeErr(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral });
    }
    const lang = getLang(interaction.guildId);
    const user = interaction.options.getUser('utente');
    if (!user) {
      return interaction.reply({ embeds: [themeErr(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral });
    }
    const reason = truncate(interaction.options.getString('motivo') || t('moderation.warn.noReason', lang), 1024) || t('moderation.warn.noReason', lang);
    if (user.bot) return interaction.reply({ embeds: [themeErr(t('moderation.warn.isBot', lang))], flags: MessageFlags.Ephemeral });

    const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ embeds: [themeErr(t('moderation.warn.owner', lang))], flags: MessageFlags.Ephemeral });
    if (member && !hierarchyAllows(interaction, member))
      return interaction.reply({ embeds: [themeErr(t('moderation.hierarchy', lang))], flags: MessageFlags.Ephemeral });

    const warn = addWarn(interaction.guild.id, user.id, { modId: interaction.user.id, reason });
    try { logCase(interaction.guild.id, { type: 'warn', userId: user.id, modId: interaction.user.id, reason, meta: { warnId: warn.id } }); } catch {}
    const total = getWarnings(interaction.guild.id, user.id).length;

    // Escalation automatica configurabile (/warnazioni): applica la soglia
    // più alta raggiunta (timeout/kick/ban). Best-effort, mai fatale.
    let extra = '';
    try {
      const rule = actionFor(total, getWarnActions(interaction.guild.id));
      if (rule && member) {
        const tag = interaction.user.tag ?? interaction.user.username;
        if (rule.action === 'timeout' && member.moderatable) {
          await member.timeout(rule.minutes * 60 * 1000, `${rule.warns} warn raggiunti | Mod: ${tag}`.slice(0, 512));
          extra = `\n${t('moderation.warn.escalatedTimeout', lang, { n: rule.warns, minutes: rule.minutes })}`;
        } else if (rule.action === 'kick' && member.kickable) {
          await member.kick(`${rule.warns} warn raggiunti | Mod: ${tag}`.slice(0, 512));
          extra = `\n${t('moderation.warn.escalatedKick', lang, { n: rule.warns })}`;
        } else if (rule.action === 'ban' && member.bannable) {
          await member.ban({ reason: `${rule.warns} warn raggiunti | Mod: ${tag}`.slice(0, 512) });
          extra = `\n${t('moderation.warn.escalatedBan', lang, { n: rule.warns })}`;
        }
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(COLORS.warn)
      .setTitle(truncate(t('moderation.warn.title', lang, { n: total, tag: user.tag ?? user.username }), 256))
      .setDescription(extra ? truncate(extra, 4000) : null)
      .addFields(
        { name: t('moderation.warn.reason', lang), value: reason },
        { name: t('moderation.warn.moderator', lang), value: truncate(interaction.user.tag ?? interaction.user.username, 256), inline: true },
        { name: t('moderation.warn.warnId', lang), value: `\`${warn.id}\``, inline: true }
      )
      .setTimestamp();
    if (!extra) embed.setDescription(null);
    applyFooter(embed, interaction);
    try {
      await interaction.reply({ embeds: [embed] });
    } catch {
      return;
    }
    await sendLog(interaction.guild, { embeds: [embed] }).catch(() => {});
    // DM all'utente (best-effort: DM chiusi / bot mai un fallimento del comando)
    try {
      const dm = new EmbedBuilder()
        .setColor(COLORS.warn)
        .setTitle(truncate(t('moderation.warn.dmTitle', lang, { server: interaction.guild.name }), 256))
        .addFields(
          { name: t('moderation.warn.reason', lang), value: reason },
          { name: t('moderation.warn.moderator', lang), value: truncate(interaction.user.tag ?? interaction.user.username, 256), inline: true },
          { name: t('moderation.warn.dmTotal', lang), value: `${total}`, inline: true }
        )
        .setTimestamp();
      await user.send({ embeds: [dm] }).catch(() => null);
    } catch {}
  },
};
