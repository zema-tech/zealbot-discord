const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../database/levels');
const { t, getLang } = require('../../utils/i18n');

// theme.js condiviso (blu fun / viola livelli, footer, medaglie, numeri).
// Fallback inline se il require fallisse: mai crashare il comando per la UI.
let T = null;
try {
  T = require('../../utils/theme');
} catch {
  T = null;
}
const COLORS = T?.COLORS ?? { purple: 0x9b59b6 };
const medal = T?.medal ?? ((i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${Number(i) + 1}.**`));
const num = T?.num ?? ((n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('it-IT') : 'n/d'));
const truncate = T?.truncate ?? ((s, m) => String(s ?? '').slice(0, m));
const applyFooter = T?.applyFooter ?? ((embed, interaction) => {
  try {
    embed.setFooter({ text: `Richiesto da ${interaction?.user?.tag ?? 'Utente'}` });
  } catch { /* footer non critico */ }
  try {
    embed.setTimestamp();
  } catch { /* ignora */ }
  return embed;
});

module.exports = {
  data: new SlashCommandBuilder().setName('top').setDescription('Classifica livelli del server'),
  cooldown: 5,
  async execute(interaction) {
    // Comando da server: in DM non c'è classifica.
    if (!interaction.guild) {
      return interaction.reply({ content: t('common.guildOnly', getLang(interaction.guildId)), ephemeral: true });
    }
    const lang = getLang(interaction.guild.id);
    // Differita: il fetch di 10 utenti può superare i 3s dell'interaction token.
    let deferred = false;
    try {
      await interaction.deferReply();
      deferred = true;
    } catch {
      deferred = false;
    }
    const send = (payload) => (deferred ? interaction.editReply(payload) : interaction.reply(payload));

    const top = getLeaderboard(interaction.guild.id, 10);
    if (!top.length) return send(t('levels.top.empty', lang));
    const lines = await Promise.all(
      top.map(async (e, i) => {
        const u = await interaction.client.users.fetch(e.id).catch(() => null);
        const member = u ? await interaction.guild.members.fetch(e.id).catch(() => null) : null;
        const display = member ? member.displayName : u ? u.username : null;
        const name = display ? `**${truncate(display, 32)}**` : t('levels.top.leftUser', lang);
        const lvl = Number.isFinite(e.level) ? Math.max(0, Math.floor(e.level)) : 0;
        const xp = Number.isFinite(e.xp) ? Math.max(0, Math.floor(e.xp)) : 0;
        return `${medal(i)} ${name} — ${t('levels.top.line', lang, { lvl: num(lvl), xp: num(xp) })}`;
      })
    );
    const embed = new EmbedBuilder()
      .setColor(COLORS.purple)
      .setTitle(truncate(t('levels.top.title', lang, { server: interaction.guild.name }), 256))
      .setThumbnail(interaction.guild.iconURL() ?? interaction.user.displayAvatarURL())
      .setDescription(truncate(lines.join('\n'), 4096));
    applyFooter(embed, interaction);
    await send({ embeds: [embed] });
  },
};
