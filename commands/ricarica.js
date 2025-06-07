const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'ricarica',
        description: 'Aggiunge un importo ricaricato ai crediti di un utente e gestisce i bonus referral.',
        staffOnly: true,
    },
    async execute(message, args, client, saveCredits, saveReferralData, config) {
        const { PREFIX, TIERED_AMOUNTS, BONUS_RATES, CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS, REFERRAL_BONUS_AMOUNT } = config;

        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        let isStaff = false; // Inizializza a false
        if (member) { // Aggiungi questo controllo!
            isStaff = member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
        }
        if (!isStaff) {
            await message.delete().catch(() => {});
            return;
        }

        await message.delete().catch(() => {});

        const targetUser = message.mentions.users.first();
        const amount = parseFloat(args[1]);

        if (!targetUser || isNaN(amount) || amount <= 0 || !TIERED_AMOUNTS.includes(amount)) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(
                    `❌ **Formato errato!** Usa: \`${PREFIX}ricarica @utente <importo>\`\nImporti validi: ${TIERED_AMOUNTS.join(", ")} ${CURRENCY}`,
                );
            return message.channel
                .send({ embeds: [errorEmbed] })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        // Applica il bonus in base all'importo della ricarica
        const bonusRate = BONUS_RATES[amount] || 1; // Se non c'è un bonus specifico, è 1 (nessun bonus)
        const finalAmount = amount * bonusRate;

        // Aggiungi i crediti all'utente target
        client.userCredits[targetUser.id] = (client.userCredits[targetUser.id] || 0) + finalAmount;
        await saveCredits(); // Salva i crediti dopo la ricarica

        const successEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(
                `✅ Ricarica completata per ${targetUser.toString()}: **${finalAmount.toFixed(2)}${CURRENCY}**`,
            )
            .addFields(
                { name: "Importo ricaricato", value: `${amount.toFixed(2)}${CURRENCY}`, inline: true },
                { name: "Bonus applicato", value: `${((bonusRate - 1) * 100).toFixed(0)}%`, inline: true },
                { name: "Nuovo saldo", value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`, inline: false }
            );

        await message.channel.send({ embeds: [successEmbed] });

        // --- Logica Referral ---
        if (client.referredUsers[targetUser.id] && !client.referredUsers[targetUser.id].bonusGiven) {
            const referrerId = client.referredUsers[targetUser.id].referrerId;
            const referrerUser = await client.users.fetch(referrerId).catch(() => null);

            if (referrerUser) {
                // Assegna il bonus al referrer
                client.userCredits[referrerId] = (client.userCredits[referrerId] || 0) + REFERRAL_BONUS_AMOUNT;
                await saveCredits();

                // Segna il bonus come dato
                client.referredUsers[targetUser.id].bonusGiven = true;
                await saveReferralData();

                const referralBonusEmbed = new EmbedBuilder()
                    .setColor("#FFD700") // Oro per il bonus
                    .setTitle("🎉 Bonus Referral Ricevuto!")
                    .setDescription(
                        `Congratulazioni, ${referrerUser.toString()}!\n` +
                        `Hai ricevuto un bonus di **${REFERRAL_BONUS_AMOUNT.toFixed(2)}${CURRENCY}** perché il tuo amico ` +
                        `${targetUser.toString()} ha completato la sua prima ricarica!`
                    )
                    .setFooter({ text: 'Continua a invitare amici per guadagnare di più!' });
                
                await message.channel.send({ embeds: [referralBonusEmbed] });
            }
        }
    },
};