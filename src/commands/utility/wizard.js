/**
 * /wizard — un tempo setup guidato interattivo, oggi puntatore alla dashboard.
 *
 * Il motore interattivo (select-menu, step, collector) è stato rimosso perché
 * non più chiamato da nessuno: la configurazione vive nella dashboard web.
 * Questo comando resta come scorciatoia che punta alla sezione giusta.
 */

const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wizard')
    .setDescription('Setup guidato del bot, passo passo (canali, ticket, automod…)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  async execute(interaction) {
    // Setup guidato spostato sulla dashboard web: nessuna scrittura da Discord,
    // solo un puntatore alla sezione corretta.
    const base = (process.env.BASE_URL || '').trim().replace(/\/+$/, '');
    const gid = interaction.guild?.id ?? interaction.guildId ?? '';
    const url = base ? `${base}/app.html#gid=${gid}` : 'apri la dashboard del bot';
    return interaction.reply({ content: `La configurazione si fa dalla dashboard: ${url} — sezione Moduli`, flags: MessageFlags.Ephemeral });
  },
};
