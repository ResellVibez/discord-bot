const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'ricarica',
        description: 'Aggiunge un importo ricaricato ai crediti di un utente.', // Descrizione originale
        staffOnly: true,
    },
    async execute(message, args, client, saveCredits, config) {
        const { PREFIX, TIERED_AMOUNTS, BONUS_RATES, CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS } = config;

        // Controllo Staff (versione originale, meno robusta delle ultime modifiche)
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
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
    },
};