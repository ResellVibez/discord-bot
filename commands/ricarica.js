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
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Solo chi può gestire il server può usare questo comando
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
        const userId = targetUser.id; // ID dell'utente che riceve la ricarica
        const staffId = interaction.user.id; // ID dello staff che esegue il comando
        const staffTag = interaction.user.tag; // Tag dello staff

        // Validazione dell'importo
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

        const bonusRate = BONUS_RATES[amount.toString()] || 1;
        const finalAmount = amount * bonusRate; // Importo finale da aggiungere al saldo

        let newBalance; // Saldo aggiornato dell'utente
        let bonusMessage = ''; // Messaggio per il bonus referral
        let referralBonusGiven = false; // Flag per la transazione
        let referrerId = null; // ID del referrer, se applicabile

        try {
            // 1. Aggiungi i crediti all'utente target
            const successAddCredits = await dataStore.addCredits(userId, finalAmount);
            if (!successAddCredits) {
                throw new Error("Errore nell'aggiunta dei crediti all'utente.");
            }
            newBalance = await dataStore.getUserCredits(userId); // Recupera il saldo aggiornato

            // 2. Gestione del bonus referral
            // Controlla se l'utente è stato referenziato e se il bonus non è stato ancora dato
            const referredInfoResult = await dataStore.db.query(
                'SELECT referred_by_code FROM referred_users WHERE user_id = $1 AND claimed_free_shipping = FALSE', // Assumiamo claimed_free_shipping FALSE significhi che il bonus referral non è ancora stato gestito, potremmo aggiungere una colonna 'referral_bonus_given'
                [userId]
            );
            const referredInfo = referredInfoResult.rows[0];

            if (referredInfo && amount >= MIN_RECHARGE_FOR_REFERRAL_BONUS) {
                // Recupera l'ID del proprietario del codice referral
                const referrerCodeOwnerResult = await dataStore.db.query(
                    'SELECT owner_id FROM referral_codes WHERE code = $1',
                    [referredInfo.referred_by_code]
                );
                referrerId = referrerCodeOwnerResult.rows[0]?.owner_id;

                if (referrerId) {
                    // Aggiungi il bonus al referrer
                    const successReferralBonus = await dataStore.addCredits(referrerId, REFERRAL_BONUS_FOR_RECHARGE);
                    if (!successReferralBonus) {
                        console.warn(`Impossibile assegnare bonus referral a ${referrerId}.`);
                    } else {
                        // Marca il bonus referral come "dato" per questo utente referenziato
                        // Ho riutilizzato 'claimed_free_shipping' come flag per "bonus gestito",
                        // ma sarebbe meglio aggiungere una colonna 'referral_bonus_given' alla tabella 'referred_users'
                        await dataStore.setClaimedFreeShipping(userId, true); // O setReferralBonusGiven(userId, true);

                        // Invia il DM al referrer
                        const referrerUser = await client.users.fetch(referrerId).catch(() => null);
                        if (referrerUser) {
                            try {
                                const refEmbed = new EmbedBuilder()
                                    .setColor('Gold')
                                    .setTitle('🎉 Bonus Referral Ricevuto!')
                                    .setDescription(
                                        `Hai ricevuto **${REFERRAL_BONUS_FOR_RECHARGE.toFixed(2)}${CURRENCY}** perché ${targetUser.username} ha ricaricato almeno ${MIN_RECHARGE_FOR_REFERRAL_BONUS}${CURRENCY}.`
                                    );
                                await referrerUser.send({ embeds: [refEmbed] });
                                bonusMessage = `\n🎁 Bonus Referral assegnato a <@${referrerId}>`;
                                referralBonusGiven = true;
                            } catch (dmError) {
                                console.warn(`Impossibile inviare DM di bonus referral a ${referrerId}:`, dmError);
                                bonusMessage = `\n⚠️ Bonus assegnato a <@${referrerId}>, ma non è stato possibile inviargli un DM.`;
                                referralBonusGiven = true;
                            }
                        } else {
                            bonusMessage = `\n⚠️ Bonus assegnato a ${referrerId}, ma l'utente non è stato trovato.`;
                            referralBonusGiven = true;
                        }
                    }
                }
            }

            // 3. Crea l'embed di successo per la ricarica
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('💳 Ricarica Completata')
                .setDescription(
                    `✅ ${targetUser} ha ricevuto **${finalAmount.toFixed(2)}${CURRENCY}**!\n` +
                    `➕ Importo: ${amount.toFixed(2)}${CURRENCY}\n` +
                    `✨ Bonus: ${((bonusRate - 1) * 100).toFixed(0)}%` +
                    bonusMessage // Include il messaggio del bonus referral se applicabile
                )
                .addFields({
                    name: '💰 Saldo attuale',
                    value: `${newBalance.toFixed(2)}${CURRENCY}`,
                    inline: false
                });

            await interaction.reply({ embeds: [successEmbed] });

            // 4. Registra la transazione
            await dataStore.addTransaction(
                userId,
                'ricarica_crediti',
                finalAmount,
                `Ricarica di ${amount}${CURRENCY} con ${((bonusRate - 1) * 100).toFixed(0)}% bonus. Eseguita da ${staffTag}.`
            );

            if (referralBonusGiven && referrerId) {
                await dataStore.addTransaction(
                    referrerId,
                    'bonus_referral_ricevuto',
                    REFERRAL_BONUS_FOR_RECHARGE,
                    `Bonus referral da ricarica di ${targetUser.tag}.`
                );
            }

        } catch (error) {
            console.error('Errore nel comando /ricarica:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante l'elaborazione della ricarica o del bonus referral. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};