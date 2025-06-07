const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'saldo',
        description: 'Mostra il saldo dei crediti tuo o di un altro utente.',
    },
    async execute(message, args, client, saveCredits, config) {
        const { CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS } = config;

        const targetUser = message.mentions.users.first();
        const authorIsStaff = message.member && message.member.roles.cache.some(role => STAFF_ROLES.includes(role.name));

        // Logica: se un utente è menzionato E l'autore del messaggio NON è staff
        if (targetUser && !authorIsStaff) {
            await message.delete().catch(() => {}); // Elimina il comando dell'utente non autorizzato
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Non hai il permesso di visualizzare il saldo di altri utenti.");
            
            return message.channel.send({ embeds: [errorEmbed] })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS))
                .catch(() => {});
        }

        // Determina quale utente mostrare il saldo: quello menzionato o l'autore del messaggio
        const userToShowBalance = targetUser || message.author;
        const balance = client.userCredits[userToShowBalance.id] || 0;

        const embed = new EmbedBuilder()
            .setColor("#00FFFF")
            .setDescription(
                `💰 Saldo ${userToShowBalance.toString()}: **${balance.toFixed(2)}${CURRENCY}**`,
            );

        // Invia l'embed con il saldo
        await message.channel.send({ embeds: [embed] });

        // *** MODIFICA QUI: Elimina il messaggio del comando originale per TUTTI i casi di !saldo ***
        // Questa riga farà sì che sia !saldo che !saldo @utente vengano eliminati.
        await message.delete().catch(() => {}); 
    },
};