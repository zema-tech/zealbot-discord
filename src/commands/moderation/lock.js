const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { t, getLang } = require('../../utils/i18n');
let theme = null;
try { theme = require('../../utils/theme'); } catch { theme = null; }
const COLORS = theme?.COLORS ?? { primary: 0x5865f2, success: 0x57f287, error: 0xed4245 };
const applyFooter = theme?.applyFooter ?? ((e) => e);
const errEmbed = theme?.err ?? ((t) => new EmbedBuilder().setColor(COLORS.error).setTitle('❌ Errore').setDescription(String(t ?? '')).setTimestamp());
const okEmbed = theme?.ok ?? ((t, d) => new EmbedBuilder().setColor(COLORS.success).setTitle(String(t)).setDescription(String(d ?? '')).setTimestamp());

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Blocca/sblocca un canale testuale')
    .addSubcommand((s) => s.setName('on').setDescription('Blocca il canale (solo staff può scrivere)'))
    .addSubcommand((s) => s.setName('off').setDescription('Sblocca il canale'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [errEmbed(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const lang = getLang(interaction.guildId);
    const sub = interaction.options.getSubcommand();
    if (!interaction.channel?.isTextBased?.() || typeof interaction.channel.permissionOverwrites?.edit !== 'function') {
      return interaction.reply({ embeds: [errEmbed(t('moderation.lock.notText', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (interaction.channel.isThread?.() || interaction.channel.isVoiceBased?.()) {
      return interaction.reply({ embeds: [errEmbed(t('moderation.lock.notText', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const everyone = interaction.guild.roles.everyone;
    if (!everyone) {
      return interaction.reply({ embeds: [errEmbed(t('moderation.lock.noEveryone', lang))], flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    try {
      if (sub === 'on') {
        await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: false });
        const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle(t('moderation.lock.on', lang)).setDescription(t('moderation.lock.onDesc', lang)).setTimestamp();
        applyFooter(embed, interaction);
        await interaction.reply({ embeds: [embed] }).catch(() => null);
      } else {
        await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: null });
        const embed = okEmbed(t('moderation.lock.off', lang), t('moderation.lock.offDesc', lang));
        applyFooter(embed, interaction);
        await interaction.reply({ embeds: [embed] }).catch(() => null);
      }
    } catch {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errEmbed(t('moderation.lock.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errEmbed(t('moderation.lock.failed', lang))], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
