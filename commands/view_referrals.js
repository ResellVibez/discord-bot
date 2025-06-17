const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('view_referrals')
    .setDescription('Mostra gli utenti referenziati e i loro referrer (solo admin).')
    .addUserOption(option =>
      option.setName('referrer')
        .setDescription('Utente da filtrare come referrer')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute({ interaction, client }) {
    const refFilter = interaction.options.getUser('referrer');
    const referrals = client.referredUsers || {};

    const entries = Object.entries(referrals).filter(([userId, data]) =>
      !refFilter || data.referrerId === refFilter.id
    );

    // ✅ Risposta immediata per evitare InteractionNotReplied
    await interaction.reply({ content: '📨 Generazione del report referral in corso...', flags: 64 });

    if (entries.length === 0) {
      const embed = new EmbedBuilder()
        .setColor('Yellow')
        .setDescription(`⚠️ Nessun utente referenziato${refFilter ? ` da ${refFilter.tag}` : ''}.`);
      return interaction.followUp({ embeds: [embed], flags: 64 });
    }

    const chunks = [];
    let current = "";

    for (const [userId, data] of entries) {
      const referred = await client.users.fetch(userId).catch(() => null);
      const referrer = await client.users.fetch(data.referrerId).catch(() => null);

      const referredTag = referred ? referred.tag : `ID: ${userId}`;
      const referrerTag = referrer ? referrer.tag : `ID: ${data.referrerId}`;
      const status = data.bonusGiven ? "✅ Dato" : "❌ Non Dato";

      const line = `• **Utente:** ${referredTag}\n  **Referenziato da:** ${referrerTag}\n  **Bonus:** ${status}\n\n`;
      if ((current + line).length > 900) {
        chunks.push(current);
        current = line;
      } else {
        current += line;
      }
    }
    if (current.length > 0) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📜 Utenti Referenziati${refFilter ? ` da ${refFilter.tag}` : ''}${chunks.length > 1 ? ` (parte ${i + 1})` : ''}`)
        .setDescription(chunks[i])
        .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

      await interaction.followUp({ embeds: [embed], flags: 64 });
    }
  }
};
