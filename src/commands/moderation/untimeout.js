const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { sendLog, hierarchyAllows } = require('../../utils/helpers');
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
const themeErr = theme?.err ?? ((t) =>
  new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp()
);
const applyFooter = theme?.applyFooter ?? ((e) => e);
const truncate = theme?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Rimuove il timeout da un utente')
    .addUserOption((o) => o.setName('utente').setDescription('Utente').setRequired(true))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo').setRequired(false))
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
    const reason = truncate(interaction.options.getString('motivo') || t('moderation.untimeout.defaultReason', lang), 512);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [themeErr(t('moderation.untimeout.notInGuild', lang))], flags: MessageFlags.Ephemeral });
    if (!member.moderatable)
      return interaction.reply({ embeds: [themeErr(t('moderation.untimeout.noPerms', lang))], flags: MessageFlags.Ephemeral });
    if (member.id === interaction.guild.ownerId && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ embeds: [themeErr(t('moderation.untimeout.owner', lang))], flags: MessageFlags.Ephemeral });
    if (!hierarchyAllows(interaction, member))
      return interaction.reply({ embeds: [themeErr(t('moderation.hierarchy', lang))], flags: MessageFlags.Ephemeral });
    if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp <= Date.now())
      return interaction.reply({ embeds: [themeErr(t('moderation.untimeout.notTimedOut', lang, { tag: user.tag ?? user.username }))], flags: MessageFlags.Ephemeral });
    try {
      await member.timeout(null, `${reason} | Mod: ${interaction.user.tag}`.slice(0, 512));
      const embed = applyFooter(
        ok(t('moderation.untimeout.title', lang), `${truncate(user.tag ?? user.username, 100)} può di nuovo parlare.\n**Motivo:** ${reason}`),
        interaction
      );
      await interaction.reply({ embeds: [embed] });
      await sendLog(interaction.guild, { embeds: [embed] });
    } catch (e) {
      console.error(e);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [themeErr(t('moderation.untimeout.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [themeErr(t('moderation.untimeout.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
