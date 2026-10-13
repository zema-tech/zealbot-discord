const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { sendLog, hierarchyAllows } = require('../../utils/helpers');
const { logCase } = require('../../database/cases');
const { t, getLang } = require('../../utils/i18n');
let theme = null;
try { theme = require('../../utils/theme'); } catch { theme = null; }
const COLORS = theme?.COLORS ?? { warn: 0xfee75c, error: 0xed4245 };
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));
const errEmbed = theme?.err ?? ((t) => new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '')).setTimestamp());

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Espelli un utente dal server')
    .addUserOption((o) => o.setName('utente').setDescription("L'utente da espellere").setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [errEmbed(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const lang = getLang(interaction.guildId);
    const user = interaction.options.getUser('utente');
    if (!user) return interaction.reply({ embeds: [errEmbed(t('moderation.invalidUser', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    const reason = truncate(interaction.options.getString('motivo') || t('moderation.noReason', lang), 512);
    const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errEmbed(t('moderation.kick.notFound', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (user.id === interaction.user.id)
      return interaction.reply({ embeds: [errEmbed(t('moderation.kick.self', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (user.id === interaction.client.user.id)
      return interaction.reply({ embeds: [errEmbed(t('moderation.kick.bot', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ embeds: [errEmbed(t('moderation.kick.owner', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (!member.kickable)
      return interaction.reply({ embeds: [errEmbed(t('moderation.kick.noPerms', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    if (!hierarchyAllows(interaction, member))
      return interaction.reply({ embeds: [errEmbed(t('moderation.hierarchy', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);

    try {
      await member.kick(truncate(`${reason} | Mod: ${interaction.user.tag ?? interaction.user.username}`, 512));
      try { logCase(interaction.guild.id, { type: 'kick', userId: user.id, modId: interaction.user.id, reason }); } catch {}
      const embed = new EmbedBuilder()
        .setColor(COLORS.warn)
        .setTitle(t('moderation.kick.title', lang))
        .addFields(
          { name: t('moderation.kick.user', lang), value: `${user.tag ?? user.username} (${user.id})`.slice(0, 1024), inline: true },
          { name: t('moderation.kick.moderator', lang), value: `${interaction.user.tag ?? interaction.user.username}`.slice(0, 1024), inline: true },
          { name: t('moderation.kick.reason', lang), value: truncate(reason, 1024) || t('moderation.noReason', lang) }
        )
        .setTimestamp();
      applyFooter(embed, interaction);
      await interaction.reply({ embeds: [embed] }).catch(() => null);
      try { await sendLog(interaction.guild, { embeds: [embed] }); } catch {}
    } catch (e) {
      console.error(e);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed(t('moderation.kick.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errEmbed(t('moderation.kick.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
