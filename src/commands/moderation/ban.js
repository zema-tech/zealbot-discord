const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { sendLog, hierarchyAllows } = require('../../utils/helpers');
const { logCase } = require('../../database/cases');
const { t, getLang } = require('../../utils/i18n');
let theme = null;
try { theme = require('../../utils/theme'); } catch { theme = null; }
const COLORS = theme?.COLORS ?? { error: 0xed4245 };
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));
const errEmbed = theme?.err ?? ((t) => new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '')).setTimestamp());

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banna un utente dal server')
    .addUserOption((o) => o.setName('utente').setDescription("L'utente da bannare").setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo del ban').setRequired(false))
    .addIntegerOption((o) =>
      o.setName('giorni').setDescription('Giorni di messaggi da eliminare (0-7)').setMinValue(0).setMaxValue(7).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [errEmbed(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const lang = getLang(interaction.guildId);
    const user = interaction.options.getUser('utente');
    if (!user) return interaction.reply({ embeds: [errEmbed(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    const reason = truncate(interaction.options.getString('motivo') || t('moderation.noReason', lang), 512);
    const days = interaction.options.getInteger('giorni') ?? 0;
    const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);

    if (user.id === interaction.user.id)
      return interaction.reply({ embeds: [errEmbed(t('moderation.ban.self', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (user.id === interaction.client.user.id)
      return interaction.reply({ embeds: [errEmbed(t('moderation.ban.bot', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (member) {
      if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
        return interaction.reply({ embeds: [errEmbed(t('moderation.ban.owner', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
      if (!member.bannable)
        return interaction.reply({ embeds: [errEmbed(t('moderation.ban.noPerms', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
      if (!hierarchyAllows(interaction, member))
        return interaction.reply({ embeds: [errEmbed(t('moderation.hierarchy', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    try {
      const auditReason = truncate(`${reason} | Mod: ${interaction.user.tag ?? interaction.user.username}`, 512);
      await interaction.guild.members.ban(user, { reason: auditReason, deleteMessageSeconds: days * 86400 });
      try { logCase(interaction.guild.id, { type: 'ban', userId: user.id, modId: interaction.user.id, reason }); } catch {}
      const uname = user.tag ?? user.username;
      const embed = new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(t('moderation.ban.title', lang))
        .addFields(
          { name: t('moderation.ban.user', lang), value: `${uname} (${user.id})`.slice(0, 1024), inline: true },
          { name: t('moderation.ban.moderator', lang), value: `${interaction.user.tag ?? interaction.user.username}`.slice(0, 1024), inline: true },
          ...(days > 0 ? [{ name: t('moderation.ban.deletedMessages', lang), value: `${days}g`, inline: true }] : []),
          { name: t('moderation.ban.reason', lang), value: truncate(reason, 1024) || t('moderation.noReason', lang) }
        )
        .setTimestamp();
      applyFooter(embed, interaction);
      await interaction.reply({ embeds: [embed] }).catch(() => null);
      try { await sendLog(interaction.guild, { embeds: [embed] }); } catch {}
    } catch (e) {
      console.error(e);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed(t('moderation.ban.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errEmbed(t('moderation.ban.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
