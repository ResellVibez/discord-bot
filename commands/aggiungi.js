const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'aggiungi',
        description: 'Aggiunge un importo specifico ai crediti di un utente.',
        staffOnly: true,
    },
    async execute(message, args, client, saveCredits, config) {
        const { PREFIX, CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS } = config;

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

        if (!targetUser || isNaN(amount) || amount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(
                    `❌ **Formato errato!** Usa: \`${PREFIX}aggiungi @utente 25\`\nImporto deve essere un numero positivo`,
                );
            return message.channel
                .send({ embeds: [errorEmbed] })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        client.userCredits[targetUser.id] = (client.userCredits[targetUser.id] || 0) + amount;
        await saveCredits(); // Salva i crediti dopo la modifica

        const successEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(
                `⚡ ${targetUser.toString()} ha ricevuto **${amount.toFixed(2)}${CURRENCY}** (credito diretto)`,
            )
            .addFields({
                name: "Nuovo saldo",
                value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
                inline: true,
            });

        return message.channel.send({ embeds: [successEmbed] });
    },
};