const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'info', // Il comando sarà !info
        description: 'Mostra informazioni utili sui crediti (FAQ).',
        // Questo comando è accessibile a TUTTI gli utenti, quindi NON mettiamo staffOnly: true
    },
    async execute(message, args, client, saveCredits, config) {
        // Elimina il messaggio del comando originale per pulizia del canale
        await message.delete().catch(() => {});

        // --- Costruisci l'Embed ---
        const infoEmbed = new EmbedBuilder()
            .setColor('#00FF00') // Colore dell'embed (un verde brillante per indicare "informazioni")
            .setTitle('INFO UTILI SUI CREDITI')
            .setDescription('Qui trovi tutte le risposte alle tue domande sui crediti!')
            .addFields(
                {
                    name: 'Come ottenere crediti?',
                    value: 'Puoi ottenere crediti tramite ricariche. Contattate un membro dello staff per maggiori info!',
                    inline: false // Ogni campo occupa una riga intera
                },
                {
                    name: 'A cosa servono i crediti?',
                    value: 'I crediti servono per acquistare servizi/benefici/vantaggi sul server.',
                    inline: false
                },
                {
                    name: 'Come visualizzo il mio saldo?',
                    value: 'Puoi visualizzare il tuo saldo con il comando `!saldo`', // `!saldo` con backticks per mostrarlo come codice
                    inline: false
                },
                {
                    name: 'Posso trasferire crediti ad altri?',
                    value: 'Al momento no, i crediti non sono trasferibili.',
                    inline: false
                },
                {
                    name: 'I crediti scadono?',
                    value: 'No, i tuoi crediti non hanno scadenza.',
                    inline: false
                }
            )
            .setTimestamp() // Aggiunge automaticamente la data e l'ora attuali nel footer
            .setFooter({
                text: 'Per altre domande, apri un ticket!',
                iconURL: 'https://i.imgur.com/ticket_icon.png' // URL di un'icona (es. una busta o un ticket). Sostituisci con l'URL di un'icona a tua scelta se ne trovi una migliore!
            });

        // --- Invia l'Embed nel Canale ---
        await message.channel.send({ embeds: [infoEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed info:', error));
    },
};