const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { t } = require('../../utils/i18n');
const { getGuildLanguage, setGuildLanguage, SUPPORTED } = require('../../core/i18n');

let T;
try {
  T = require('../../utils/theme');
} catch {
  T = {
    COLORS: { primary: 0x5865f2 },
    truncate: (s, m) => String(s ?? '').slice(0, m),
    applyFooter: (e) => e,
  };
}

// /language imposta DIRETTAMENTE (a differenza di /lingua che rimanda alla
// dashboard). Solo amministratori. Default globale: inglese.
module.exports = {
  data: new SlashCommandBuilder()
    .setName('language')
    .setDescription('Set the bot language for this server')
    .addStringOption((o) =>
      o.setName('lingua').setDescription('Language / Lingua').setRequired(true)
        .addChoices({ name: 'English 🇬🇧', value: 'en' }, { name: 'Italiano 🇮🇹', value: 'it' })
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guildId || !interaction.guild) {
      return interaction.reply({ content: t('common.guildOnly', 'en'), flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: t('common.noPerms', getGuildLanguage(interaction.guildId)), flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const lang = interaction.options.getString('lingua', true);
    if (!SUPPORTED.includes(lang)) {
      return interaction.reply({ content: `❌ Unsupported language (use: ${SUPPORTED.join(', ')}).`, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    try {
      setGuildLanguage(interaction.guildId, lang);
    } catch (e) {
      return interaction.reply({ content: `❌ ${e.message}`, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
    const cur = getGuildLanguage(interaction.guildId);
    const label = cur === 'en' ? 'English 🇬🇧' : 'Italiano 🇮🇹';
    const embed = new EmbedBuilder()
      .setColor(T.COLORS.primary ?? 0x5865f2)
      .setTitle(t('lingua.title', cur))
      .setDescription(T.truncate(t('lingua.set', cur, { label, lang: cur }), 4000))
      .setTimestamp();
    try { T.applyFooter(embed, interaction); } catch {}
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral }).catch(() => null);
  },
};
