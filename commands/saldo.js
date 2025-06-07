const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'saldo',
        description: 'Mostra il saldo dei crediti tuo o di un altro utente.',
    },
    async execute(message, args, client, saveCredits, config) {
        const { CURRENCY, STAFF_ROLES, ERROR_MESSAGE_TIMEOUT_MS } = config; // Aggiunto ERROR_MESSAGE_TIMEOUT_MS

        const targetUser = message.mentions.users.first(); // Ottieni l'utente menzionato, se presente
        // Verifica se l'autore del messaggio è staff
        const authorIsStaff = message.member && message.member.roles.cache.some(role => STAFF_ROLES.includes(role.name));

        // Logica: se un utente è menzionato E l'autore del messaggio NON è staff
        if (targetUser && !authorIsStaff) {
            await message.delete().catch(() => {}); // Elimina il comando dell'utente non autorizzato
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Non hai il permesso di visualizzare il saldo di altri utenti.");

            // Invia il messaggio di errore e lo fa auto-eliminare dopo il timeout
            return message.channel.send({ embeds: [errorEmbed] })
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS))
                .catch(() => {}); // Gestisce errori nell'eliminazione del messaggio di errore
        }

        // Determina quale utente mostrare il saldo: quello menzionato o l'autore del messaggio
        const userToShowBalance = targetUser || message.author;
        const balance = client.userCredits[userToShowBalance.id] || 0;

        const embed = new EmbedBuilder()
            .setColor("#00FFFF")
            .setDescription(
                `💰 Saldo <span class="math-inline">\{userToShowBalance\.toString\(\)\}\: \*\*</span>{balance.toFixed(2)}${CURRENCY}**`,
            );

        // Se l'utente è staff E ha menzionato qualcuno, elimina il suo comando
        if (targetUser && authorIsStaff) {
             await message.delete().catch(() => {});
        } else {
            // Se non ha menzionato nessuno (quindi !saldo) o se è staff ma non ha menzionato nessuno,
            // il messaggio non viene eliminato, o risponde con il proprio saldo
        }

        return message.reply({ embeds: [embed] });
    },
};