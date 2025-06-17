const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ricarica')
    .setDescription('Aggiunge crediti a un utente con bonus e gestisce eventuale bonus referral.')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('Utente a cui aggiungere i crediti')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('importo')
        .setDescription('Importo da ricaricare (es: 15, 30, 50...)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute({ interaction, client, config, dataStore }) {
    const {
      TIERED_AMOUNTS,
      BONUS_RATES,
      CURRENCY,
      REFERRAL_BONUS_FOR_RECHARGE,
      MIN_RECHARGE_FOR_REFERRAL_BONUS,
      MAX_RECHARGE_AMOUNT
    } = config;

    const targetUser = interaction.options.getUser('utente');
    const amount = interaction.options.getNumber('importo');

    if (!TIERED_AMOUNTS.includes(amount)) {
      return interaction.reply({
        content: `❌ Importo non valido. Sono ammessi solo: ${TIERED_AMOUNTS.join(', ')} ${CURRENCY}`,
        ephemeral: true
      });
    }

    if (amount > MAX_RECHARGE_AMOUNT) {
      return interaction.reply({
        content: `❌ Importo troppo alto. Max consentito: ${MAX_RECHARGE_AMOUNT}${CURRENCY}`,
        ephemeral: true
      });
    }

    const userId = targetUser.id;
    const bonusRate = BONUS_RATES[amount.toString()] || 1;
    const finalAmount = amount * bonusRate;

    const userCredits = await dataStore.getUserCredits();
    userCredits[userId] = (userCredits[userId] || 0) + finalAmount;
    const newBalance = userCredits[userId];
    await dataStore.setUserCredits(userCredits);
    client.userCredits = userCredits; // ✅ Sincronizza la cache locale

    const referrals = await dataStore.getReferrals();
    const referredInfo = referrals.referredUsers?.[userId];
    let bonusMessage = '';
    let referralBonusGiven = false;

    if (referredInfo && !referredInfo.bonusGiven && amount >= MIN_RECHARGE_FOR_REFERRAL_BONUS) {
      const referrerId = referredInfo.referrerId;
      const referrerUser = await client.users.fetch(referrerId).catch(() => null);

      if (referrerUser) {
        userCredits[referrerId] = (userCredits[referrerId] || 0) + REFERRAL_BONUS_FOR_RECHARGE;
        await dataStore.setUserCredits(userCredits);
        client.userCredits = userCredits; // ✅ Aggiorna anche cache referrer

        referrals.referredUsers[userId].bonusGiven = true;
        await dataStore.setReferrals(referrals);

        try {
          const refEmbed = new EmbedBuilder()
            .setColor('Gold')
            .setTitle('🎉 Bonus Referral Ricevuto!')
            .setDescription(
              `Hai ricevuto **${REFERRAL_BONUS_FOR_RECHARGE.toFixed(2)}${CURRENCY}** perché ${targetUser.username} ha ricaricato almeno ${MIN_RECHARGE_FOR_REFERRAL_BONUS}${CURRENCY}.`
            );

          await referrerUser.send({ embeds: [refEmbed] });
          bonusMessage = `\n🎁 Bonus Referral assegnato a ${referrerUser.tag}`;
          referralBonusGiven = true;
        } catch {
          bonusMessage = `\n⚠️ Bonus assegnato a ${referrerUser.tag}, ma non è stato possibile inviargli un DM.`;
          referralBonusGiven = true;
        }
      }
    }

    const successEmbed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('💳 Ricarica Completata')
      .setDescription(
        `✅ ${targetUser} ha ricevuto **${finalAmount.toFixed(2)}${CURRENCY}**!\n` +
        `➕ Importo: ${amount.toFixed(2)}${CURRENCY}\n` +
        `✨ Bonus: ${((bonusRate - 1) * 100).toFixed(0)}%` +
        bonusMessage
      )
      .addFields({
        name: '💰 Saldo attuale',
        value: `${newBalance.toFixed(2)}${CURRENCY}`,
        inline: false
      });

    await interaction.reply({ embeds: [successEmbed] });

    const transactions = await dataStore.getTransactions();
    const transactionId = `${Date.now()}-${userId}`;

    transactions[transactionId] = {
      timestamp: new Date().toISOString(),
      staffId: interaction.user.id,
      staffUsername: interaction.user.tag,
      userId: userId,
      username: targetUser.tag,
      rechargeAmount: amount,
      finalAmountAdded: finalAmount,
      bonusRate: (bonusRate - 1),
      referralBonusGiven: referralBonusGiven,
      referrerId: referralBonusGiven ? referredInfo?.referrerId : null,
      referralBonusAmount: referralBonusGiven ? REFERRAL_BONUS_FOR_RECHARGE : 0
    };

    await dataStore.setTransactions(transactions);
  }
};
