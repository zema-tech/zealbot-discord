const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { t, getLang } = require('../../utils/i18n');

// theme.js condiviso, con fallback inline se il require fallisse (mai nomi/opzioni diversi).
let ok, err, applyFooter;
try {
  ({ ok, err, applyFooter } = require('../../utils/theme'));
} catch {
  const { EmbedBuilder } = require('discord.js');
  ok = (t, d) => new EmbedBuilder().setColor(0x57f287).setTitle(String(t ?? '').slice(0, 256)).setDescription(String(d ?? '').slice(0, 4000)).setTimestamp();
  err = (t) => new EmbedBuilder().setColor(0xed4245).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp();
  applyFooter = (e, i) => { try { e.setFooter({ text: `Richiesto da ${i?.user?.tag ?? i?.user?.username ?? 'Utente'}` }); } catch {} try { e.setTimestamp(); } catch {} return e; };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Imposta lo slowmode di un canale')
    .addIntegerOption((o) => o.setName('secondi').setDescription('Secondi di attesa (0 = disattiva, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption((o) => o.setName('canale').setDescription('Canale (default: questo)').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [err(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral });
    }
    const lang = getLang(interaction.guildId);
    const secs = interaction.options.getInteger('secondi');
    // Difesa in profondità (l'opzione impone già 0–21600): niente NaN/negativi/oltre-max all'API.
    if (!Number.isFinite(secs) || secs < 0 || secs > 21600) {
      return interaction.reply({ embeds: [err(t('moderation.slowmode.badValue', lang))], flags: MessageFlags.Ephemeral });
    }
    // getChannel può restituire un oggetto parziale: risolvi il canale completo della guild.
    const selected = interaction.options.getChannel('canale');
    let ch = selected || interaction.channel;
    if (selected && interaction.guild) {
      ch = interaction.guild.channels.cache.get(selected.id) ?? await interaction.guild.channels.fetch(selected.id).catch(() => selected);
    }
    if (!ch?.isTextBased?.() || typeof ch.setRateLimitPerUser !== 'function') {
      return interaction.reply({ embeds: [err(t('moderation.slowmode.notText', lang))], flags: MessageFlags.Ephemeral });
    }
    const respond = (payload) => {
      if (interaction.replied || interaction.deferred) return interaction.followUp(payload).catch(() => {});
      return interaction.reply(payload).catch(() => {});
    };
    try {
      await ch.setRateLimitPerUser(secs, `Slowmode ${secs}s | Mod: ${interaction.user.tag ?? interaction.user.username}`);
      const embed = secs === 0
        ? applyFooter(ok(t('moderation.slowmode.off', lang), `Slowmode di ${ch} **disattivato**.`), interaction)
        : applyFooter(ok(t('moderation.slowmode.on', lang), `Slowmode di ${ch} impostato a **${secs}s**.`), interaction);
      await respond({ embeds: [embed] });
    } catch {
      await respond({ embeds: [err(t('moderation.slowmode.failed', lang))], flags: MessageFlags.Ephemeral });
    }
  },
};
