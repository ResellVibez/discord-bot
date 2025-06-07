const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'togli',
        description: 'Toglie un importo specifico dai crediti di un utente.',
        staffOnly: true,
    },
    async execute(message, args, client, saveCredits, config) {
        const { PREFIX, CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS } = config;

        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
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
                    `❌ **Formato errato!** Usa: \`${PREFIX}togli @utente 10\`\nImporto deve essere un numero positivo`,
                );
            return message.channel
                .send({ embeds: [errorEmbed] })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        if ((client.userCredits[targetUser.id] || 0) < amount) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(
                    `❌ **Credito insufficiente!**\nSaldo attuale: **${(client.userCredits[targetUser.id] || 0).toFixed(2)}${CURRENCY}**`,
                );
            return message.channel
                .send({ embeds: [errorEmbed] })
                .then((msg) => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        client.userCredits[targetUser.id] -= amount;
        await saveCredits(); // Salva i crediti dopo la modifica

        const successEmbed = new EmbedBuilder()
            .setColor("#FFA500")
            .setDescription(
                `📦 **Tolti ${amount.toFixed(2)}${CURRENCY}** da ${targetUser.toString()}`,
            )
            .addFields({
                name: "Nuovo saldo",
                value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
                inline: true,
            });

        return message.channel.send({ embeds: [successEmbed] });
    },
};