const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'ricarica',
        description: 'Ricarica i crediti di un utente con importi tier e bonus.',
        staffOnly: true, // Indica che è un comando solo per lo staff
    },
    async execute(message, args, client, saveCredits, saveReferralData, config) {
        const { PREFIX, TIERED_AMOUNTS, BONUS_RATES, CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS, REFERRAL_BONUS_AMOUNT } = config;

        // Verifica permessi staff (viene fatta qui per coerenza con il comando)
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
        if (!isStaff) {
            await message.delete().catch(() => {}); // Elimina il comando se non è staff
            return;
        }

        // Elimina sempre il comando dello staff
        await message.delete().catch(() => {});

        const targetUser = message.mentions.users.first();
        const amount = parseFloat(args[1]);

        if (!targetUser || !amount || !TIERED_AMOUNTS.includes(amount)) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(
                    `❌ **Formato errato!** Usa: \`${PREFIX}ricarica @utente 50\`\n**Importi validi:** ${TIERED_AMOUNTS.join(", ")}`,
                );
            return message.channel
                .send({ embeds: [errorEmbed] })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        const total = amount * BONUS_RATES[amount];
        client.userCredits[targetUser.id] = (client.userCredits[targetUser.id] || 0) + total;
        await saveCredits(); // Salva i crediti dopo la modifica

        // --- INIZIO: Logica Sistema Referral (NUOVO BLOCCO) ---
        const referredUserData = client.referralData.referredUsers[targetUser.id]; // Ottieni i dati referral del "referred"

        // Se l'utente è stato referrato E il bonus non è ancora stato erogato per lui
        if (referredUserData && !referredUserData.hasTriggeredReward) {
            const referrerId = referredUserData.referrerId; // ID di chi ha invitato
            const referralBonus = REFERRAL_BONUS_AMOUNT; // L'importo del bonus referral da config.json

            // Aggiungi il bonus crediti all'invitante (referrer)
            client.userCredits[referrerId] = (client.userCredits[referrerId] || 0) + referralBonus;
            await saveCredits(); // Salva i crediti aggiornati del referrer

            // Marca il referral come "bonus già erogato"
            referredUserData.hasTriggeredReward = true;
            await saveReferralData(); // Salva lo stato aggiornato del referralData

            // Notifica l'invitante (referrer) del bonus ricevuto
            const referrerEmbed = new EmbedBuilder()
                .setColor('#FFD700') // Colore oro per il bonus referral
                .setDescription(`🎉 Complimenti <@${referrerId}>! Il tuo amico ${targetUser.toString()} ha fatto la sua **prima ricarica di ${amount}${CURRENCY}** e hai ricevuto **${referralBonus.toFixed(2)}${CURRENCY}** come bonus referral!`);

            // Invia la notifica nel canale corrente dove è stato usato !ricarica
            await message.channel.send({ embeds: [referrerEmbed] });
        }
        // --- FINE: Logica Sistema Referral ---

        const successEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(
                `✅ ${targetUser.toString()} ha ricevuto **${total.toFixed(2)}${CURRENCY}** (${amount}${CURRENCY} + ${((BONUS_RATES[amount] - 1) * 100).toFixed(0)}% bonus)`,
            )
            .addFields({
                name: "Nuovo saldo",
                value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
                inline: true,
            });

        return message.channel.send({ embeds: [successEmbed] });
    },
};