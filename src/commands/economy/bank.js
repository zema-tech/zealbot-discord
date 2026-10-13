const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getUser, updateUser } = require('../../database/economy');
const { t, getLang } = require('../../utils/i18n');

let theme = null;
try {
  theme = require('../../utils/theme');
} catch {
  theme = null;
}
const COLORS = theme?.COLORS || { gold: 0xffd700, error: 0xed4245 };
const themeErr =
  typeof theme?.err === 'function'
    ? theme.err
    : (t) =>
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('❌ Errore')
          .setDescription(String(t ?? '').slice(0, 4000))
          .setTimestamp();
const themeFooter =
  typeof theme?.applyFooter === 'function'
    ? theme.applyFooter
    : (e, i) => {
        try {
          e.setFooter({ text: `Richiesto da ${i?.user?.tag ?? i?.user?.username ?? 'Utente'}` });
        } catch {}
        try {
          e.setTimestamp();
        } catch {}
        return e;
      };
const themeNum = typeof theme?.num === 'function' ? theme.num : (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('it-IT') : 'n/d');
const themeTruncate =
  typeof theme?.truncate === 'function'
    ? theme.truncate
    : (s, max) => String(s ?? '').slice(0, max);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('Gestisci la banca (al sicuro dai furti)')
    .addSubcommand((s) => s.setName('deposita').setDescription('Deposita monete in banca').addIntegerOption((o) => o.setName('importo').setDescription('Quantità').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('preleva').setDescription('Preleva monete dalla banca').addIntegerOption((o) => o.setName('importo').setDescription('Quantità').setRequired(true).setMinValue(1))),
  cooldown: 3,
  async execute(interaction) {
    const safeReply = async (payload) => {
      try {
        return await interaction.reply(payload);
      } catch {
        try {
          return await interaction.followUp(payload);
        } catch {
          return null;
        }
      }
    };

    if (!interaction.guild?.id) {
      await safeReply({ embeds: [themeErr(t('economy.guildOnly', getLang(interaction.guild?.id)))], flags: MessageFlags.Ephemeral });
      return;
    }
    const lang = getLang(interaction.guild.id);

    let sub;
    try {
      sub = interaction.options.getSubcommand();
    } catch {
      await safeReply({ embeds: [themeErr(t('economy.bank.badSub', lang))], flags: MessageFlags.Ephemeral });
      return;
    }
    const amount = interaction.options.getInteger('importo');
    if (!Number.isFinite(amount) || amount < 1) {
      await safeReply({ embeds: [themeErr(t('economy.bank.badAmount', lang))], flags: MessageFlags.Ephemeral });
      return;
    }

    const gid = interaction.guild.id;
    const uid = interaction.user?.id;
    if (!uid) {
      await safeReply({ embeds: [themeErr(t('economy.invalidUser', lang))], flags: MessageFlags.Ephemeral });
      return;
    }

    let u;
    try {
      u = getUser(gid, uid) || {};
    } catch {
      u = {};
    }
    const balance = Number.isFinite(u.balance) ? u.balance : 0;
    const bank = Number.isFinite(u.bank) ? u.bank : 0;

    const scheda = (titolo, emoji, testo) => {
      const e = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle(themeTruncate(`${emoji} ${titolo}`, 256))
        .setDescription(themeTruncate(testo, 4000));
      try {
        const url = interaction.user?.displayAvatarURL?.();
        if (url) e.setThumbnail(url);
      } catch {}
      themeFooter(e, interaction);
      return e;
    };

    if (sub === 'deposita') {
      if (balance < amount) {
        await safeReply({ embeds: [themeErr(t('economy.bank.noWallet', lang))], flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        updateUser(gid, uid, { balance: balance - amount, bank: bank + amount });
      } catch {
        await safeReply({ embeds: [themeErr(t('economy.bank.depositFailed', lang))], flags: MessageFlags.Ephemeral });
        return;
      }
      await safeReply({
        embeds: [scheda(t('economy.bank.depositTitle', lang), '🏦', t('economy.bank.depositBody', lang, { a: themeNum(amount), w: themeNum(balance - amount), b: themeNum(bank + amount) }))],
      });
      return;
    }
    if (sub === 'preleva') {
      if (bank < amount) {
        await safeReply({ embeds: [themeErr(t('economy.bank.noBank', lang))], flags: MessageFlags.Ephemeral });
        return;
      }
      try {
        updateUser(gid, uid, { balance: balance + amount, bank: bank - amount });
      } catch {
        await safeReply({ embeds: [themeErr(t('economy.bank.withdrawFailed', lang))], flags: MessageFlags.Ephemeral });
        return;
      }
      await safeReply({
        embeds: [scheda(t('economy.bank.withdrawTitle', lang), '👛', t('economy.bank.withdrawBody', lang, { a: themeNum(amount), w: themeNum(balance + amount), b: themeNum(bank - amount) }))],
      });
      return;
    }
    await safeReply({ embeds: [themeErr(t('economy.bank.badSub', lang))], flags: MessageFlags.Ephemeral });
  },
};
