const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("referral")
    .setDescription("Usa un codice referral per ottenere una spedizione gratuita")
    .addStringOption(option =>
      option.setName("codice")
        .setDescription("Il codice referral da usare")
        .setRequired(true)
    )
    .setDMPermission(false),

  async execute({ interaction, dataStore, config }) {
    const {
      CURRENCY,
      REFERRED_WELCOME_FREE_SHIPPINGS,
      REFERRAL_BONUS_FOR_RECHARGE,
      MIN_RECHARGE_FOR_REFERRAL_BONUS
    } = config;

    const invitedUserId = interaction.user.id;
    const username = interaction.user.username;
    const referralCode = interaction.options.getString("codice");

    const referrals = await dataStore.getReferrals();
    referrals.codes = referrals.codes || {};
    referrals.referredUsers = referrals.referredUsers || {};

    if (referrals.referredUsers[invitedUserId]) {
      return interaction.reply({
        content: "❌ Hai già usato un codice referral o sei già stato referenziato.",
        flags: 64
      });
    }

    const referrerId = Object.keys(referrals.codes).find(
      uid => referrals.codes[uid] === referralCode
    );

    if (!referrerId) {
      return interaction.reply({
        content: "❌ Codice referral non valido o non trovato.",
        flags: 64
      });
    }

    if (referrerId === invitedUserId) {
      return interaction.reply({
        content: "❌ Non puoi referenziare te stesso.",
        flags: 64
      });
    }

    // Salva il referral
    referrals.referredUsers[invitedUserId] = {
      referrerId: referrerId,
      bonusGiven: false
    };
    await dataStore.setReferrals(referrals);

    // Aggiungi la spedizione gratuita all'utente invitato
    const freeShippings = await dataStore.getFreeShippings();
    freeShippings[invitedUserId] = (freeShippings[invitedUserId] || 0) + REFERRED_WELCOME_FREE_SHIPPINGS;
    await dataStore.setFreeShippings(freeShippings);

    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ Benvenuto nel Programma Referral!")
      .setDescription(
        `Hai usato il codice di <@${referrerId}>!\n\n` +
        `**🎁 Per te:** ${REFERRED_WELCOME_FREE_SHIPPINGS} spedizione gratuita in Italia.\n` +
        `**💸 Per <@${referrerId}>:** riceverà ${REFERRAL_BONUS_FOR_RECHARGE.toFixed(2)}${CURRENCY} quando effettuerai una ricarica di almeno ${MIN_RECHARGE_FOR_REFERRAL_BONUS.toFixed(2)}${CURRENCY}.\n\n` +
        `Puoi riscattare la tua spedizione con il comando /riscatta_spedizione`
      );

    return interaction.reply({
      embeds: [embed],
      flags: 64
    });
  },
};
