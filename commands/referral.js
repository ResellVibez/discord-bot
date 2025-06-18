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
    .setDMPermission(false), // Questo comando dovrebbe funzionare solo nei server

  async execute({ interaction, dataStore, config }) {
    const {
      CURRENCY,
      REFERRED_WELCOME_FREE_SHIPPINGS,
      REFERRAL_BONUS_FOR_RECHARGE,
      MIN_RECHARGE_FOR_REFERRAL_BONUS
    } = config;

    const invitedUserId = interaction.user.id;
    const username = interaction.user.username; // Per l'embed, se necessario
    const referralCode = interaction.options.getString("codice");

    try {
      // 1. Controlla se l'utente ha già usato un codice referral
      const existingReferral = await dataStore.db.query(
        'SELECT user_id FROM referred_users WHERE user_id = $1',
        [invitedUserId]
      );

      if (existingReferral.rows.length > 0) {
        const alreadyUsedEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription("❌ Hai già usato un codice referral o sei già stato referenziato.");
        return interaction.reply({ embeds: [alreadyUsedEmbed], ephemeral: true }); // flags: 64 è deprecato
      }

      // 2. Verifica se il codice referral è valido e ottieni l'owner_id
      const referrerCodeResult = await dataStore.db.query(
        'SELECT owner_id FROM referral_codes WHERE code = $1',
        [referralCode]
      );
      const referrerCodeInfo = referrerCodeResult.rows[0]; // Prende la prima riga, se esiste

      if (!referrerCodeInfo) { // Se non ci sono righe, il codice non esiste
        const invalidCodeEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription("❌ Codice referral non valido o non trovato.");
        return interaction.reply({ embeds: [invalidCodeEmbed], ephemeral: true });
      }

      const referrerId = referrerCodeInfo.owner_id;

      if (referrerId === invitedUserId) {
        const selfReferEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setDescription("❌ Non puoi referenziare te stesso.");
        return interaction.reply({ embeds: [selfReferEmbed], ephemeral: true });
      }

      // 3. Salva il referral nel database
      // Usa il metodo addReferredUser del DataStore
      const successReferredUser = await dataStore.addReferredUser(invitedUserId, referralCode);
      if (!successReferredUser) {
          throw new Error("Errore nel salvare il referral nel database.");
      }

      // 4. Aggiungi la spedizione gratuita all'utente invitato
      // Usa il metodo addUserFreeShippings del DataStore
      const successFreeShipping = await dataStore.addUserFreeShippings(invitedUserId, REFERRED_WELCOME_FREE_SHIPPINGS);
      if (!successFreeShipping) {
          throw new Error("Errore nell'aggiungere la spedizione gratuita.");
      }

      // 5. Incrementa l'uso del codice referral
      // Questo è importante per tenere traccia dell'attività del codice
      await dataStore.incrementReferralUses(referralCode);


      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("✅ Benvenuto nel Programma Referral!")
        .setDescription(
          `Hai usato il codice di <@${referrerId}>!\n\n` +
          `**🎁 Per te:** ${REFERRED_WELCOME_FREE_SHIPPINGS} spedizion${REFERRED_WELCOME_FREE_SHIPPINGS === 1 ? 'e' : 'i'} gratuita${REFERRED_WELCOME_FREE_SHIPPINGS === 1 ? '' : 'e'} in Italia.\n` +
          `**💸 Per <@${referrerId}>:** riceverà ${REFERRAL_BONUS_FOR_RECHARGE.toFixed(2)}${CURRENCY} quando effettuerai una ricarica di almeno ${MIN_RECHARGE_FOR_REFERRAL_BONUS.toFixed(2)}${CURRENCY}.\n\n` +
          `Puoi riscattare la tua spedizione con il comando /riscatta_spedizione`
        );

      return interaction.reply({ embeds: [embed], ephemeral: true }); // flags: 64 è deprecato

    } catch (error) {
      console.error('Errore nel comando /referral:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription("❌ Si è verificato un errore durante l'applicazione del codice referral. Riprova più tardi.");
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};