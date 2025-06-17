const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("view_transactions")
    .setDescription("Mostra le ultime transazioni (solo admin).")
    .addUserOption(option =>
      option.setName("utente")
        .setDescription("Utente per cui mostrare le transazioni")
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName("limite")
        .setDescription("Numero massimo di transazioni da mostrare (max 20)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute({ interaction, client, config }) {
    const { CURRENCY } = config;
    const DEFAULT_LIMIT = 5;
    const targetUser = interaction.options.getUser("utente");
    const limit = interaction.options.getInteger("limite") || DEFAULT_LIMIT;

    const allTransactions = Object.values(client.transactions || {});
    let filteredTransactions = allTransactions;

    if (targetUser) {
      filteredTransactions = allTransactions.filter(
        tx => (tx.targetUserId === targetUser.id || tx.userId === targetUser.id || tx.staffId === targetUser.id || tx.referrerId === targetUser.id)
      );
    }

    filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const transactionsToShow = filteredTransactions.slice(0, limit);

    if (transactionsToShow.length === 0) {
      const noTxEmbed = new EmbedBuilder()
        .setColor("#FFD700")
        .setDescription(`⚠️ Nessuna transazione trovata${targetUser ? ` per ${targetUser.tag}` : ''}.`);
      return interaction.reply({ embeds: [noTxEmbed], flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setColor("#0099FF")
      .setTitle(`📜 Ultime ${transactionsToShow.length} transazioni${targetUser ? ` per ${targetUser.tag}` : ''}`)
      .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

    for (const tx of transactionsToShow) {
      const date = new Date(tx.timestamp).toLocaleString('it-IT', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      let description = `**Tipo:** `;
      let title = `Transazione`;

      if (tx.type === "redeem_free_shipping") {
        title = `📦 Riscatto Spedizione`;
        description += `\`Riscatto Spedizione Gratuita\`\n` +
          `**Utente:** ${tx.username} (${tx.userId})\n` +
          `**Spedizioni Prima:** ${tx.freeShippingsBefore}\n` +
          `**Spedizioni Dopo:** ${tx.freeShippingsAfter}`;
      } else if (tx.type === "recharge" || (tx.rechargeAmount !== undefined && tx.finalAmountAdded !== undefined)) {
        title = `💳 Ricarica Crediti`;
        description += `\`Ricarica Crediti\`\n` +
          `**Utente Ricaricato:** ${tx.username || tx.targetUserUsername} (${tx.userId || tx.targetUserId})\n` +
          `**Staff:** ${tx.staffUsername} (${tx.staffId})\n` +
          `**Importo Base:** ${tx.rechargeAmount.toFixed(2)}${CURRENCY}\n` +
          `**Importo Finale:** ${tx.finalAmountAdded.toFixed(2)}${CURRENCY}`;
        if (tx.bonusRateApplied && tx.bonusRateApplied !== "0") {
          description += `\n**Bonus Ricarica:** ${tx.bonusRateApplied}%`;
        }
        if (tx.referralBonusGiven) {
          description += `\n**Bonus Referral Dato:** Sì (${tx.referralBonusAmount.toFixed(2)}${CURRENCY} a ${tx.referrerId ? `<@${tx.referrerId}>` : 'referrer sconosciuto'})`;
        }
      } else {
        title = `⚠️ Transazione Sconosciuta`;
        description += `\`Tipo Sconosciuto\`\n${JSON.stringify(tx, null, 2)}`;
      }

      embed.addFields({
        name: `${title} (${date})`,
        value: description,
        inline: false
      });
    }

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
