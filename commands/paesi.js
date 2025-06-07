const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'paesi', // Il comando sarà !paesi
        description: 'Mostra i paesi disponibili per la spedizione.',
        // Questo comando è accessibile a TUTTI gli utenti, quindi NON mettiamo staffOnly: true
    },
    async execute(message, args, client, saveCredits, config) {
        // Elimina il messaggio del comando originale per pulizia del canale
        await message.delete().catch(() => {});

        // --- Testo Esatto per la Descrizione e i Campi ---
        // Ho formattato il testo esattamente come richiesto
        const embedDescription = `Il nostro servizio di spedizione è attualmente disponibile per le seguenti destinazioni:`;
        const paesiList = `
Italia
Spagna
Francia
Austria
Belgio
Portogallo
Germania
Paesi Bassi
Lussemburgo
`.trim(); // .trim() per rimuovere spazi bianchi extra all'inizio/fine

        // --- Costruisci l'Embed ---
        const paesiEmbed = new EmbedBuilder()
            .setColor('#3498DB') // Un colore blu (info/elenco)
            .setTitle('Paesi Disponibili per la Spedizione')
            .setDescription(embedDescription)
            .addFields(
                {
                    name: 'Destinazioni:', // Un titolo per la lista dei paesi
                    value: paesiList,
                    inline: false
                }
            )
            .setTimestamp() // Aggiunge automaticamente la data e l'ora attuali
            // Nessun footer specifico richiesto, quindi lo ometto per seguire "esatte parole"
            ;

        // --- Invia l'Embed nel Canale ---
        await message.channel.send({ embeds: [paesiEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed paesi:', error));
    },
};