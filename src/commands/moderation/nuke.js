const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t, getLang } = require('../../utils/i18n');

// theme.js condiviso, con fallback inline se il require fallisse (mai nomi/opzioni diversi).
let err, info, applyFooter;
try {
  ({ err, info, applyFooter } = require('../../utils/theme'));
} catch {
  const { EmbedBuilder } = require('discord.js');
  err = (t) => new EmbedBuilder().setColor(0xed4245).setTitle('❌ Errore').setDescription(String(t ?? '').slice(0, 4000)).setTimestamp();
  info = (t, d, c = 0x5865f2) => new EmbedBuilder().setColor(c ?? 0x5865f2).setTitle(String(t ?? '').slice(0, 256)).setDescription(String(d ?? '').slice(0, 4000)).setTimestamp();
  applyFooter = (e, i) => { try { e.setFooter({ text: `Richiesto da ${i?.user?.tag ?? i?.user?.username ?? 'Utente'}` }); } catch {} try { e.setTimestamp(); } catch {} return e; };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Rigenera il canale (clona + elimina il vecchio)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 10,
  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({ embeds: [err(t('common.guildOnly', getLang(interaction.guildId)))], flags: MessageFlags.Ephemeral });
    }
    const lang = getLang(interaction.guildId);
    if (!interaction.channel?.isTextBased?.() || typeof interaction.channel.clone !== 'function') {
      return interaction.reply({ embeds: [err(t('moderation.nuke.notText', lang))], flags: MessageFlags.Ephemeral });
    }
    // Fallisce subito con messaggio chiaro invece di fallire al click del bottone.
    const me = interaction.guild.members.me;
    if (me && !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ embeds: [err(t('moderation.nuke.noPerms', lang))], flags: MessageFlags.Ephemeral });
    }
    if (interaction.channel && 'manageable' in interaction.channel && !interaction.channel.manageable) {
      return interaction.reply({ embeds: [err(t('moderation.nuke.notManageable', lang))], flags: MessageFlags.Ephemeral });
    }
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`nuke_confirm:${interaction.channelId}`).setLabel('CONFERMA NUKE').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('nuke_cancel').setLabel(t('moderation.nuke.cancel', lang)).setStyle(ButtonStyle.Secondary)
    );
    const embed = applyFooter(info(t('moderation.nuke.confirmTitle', lang), `Tutti i messaggi di ${interaction.channel} verranno eliminati.\nPremi **CONFERMA NUKE** per rigenerare il canale, oppure **Annulla**.`, 0xfee75c), interaction);
    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  },
};
