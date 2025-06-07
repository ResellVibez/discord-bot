const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'spedizione', // Il comando sarà !spedizione
        description: 'Mostra informazioni sulle etichette di spedizione.',
        // Questo comando è accessibile a TUTTI gli utenti, quindi NON mettiamo staffOnly: true
    },
    async execute(message, args, client, saveCredits, config) {
        // Elimina il messaggio del comando originale per pulizia del canale
        await message.delete().catch(() => {});

        // --- Testo Esatto per la Descrizione e i Campi ---
        // Ho formattato il testo esattamente come richiesto
        const embedDescription = `Il nostro servizio fornisce etichette fino a 2 kg. Il prezzo è fisso, indipendentemente dal peso (0.5 kg, 1 kg o 2 kg).`;
        const prezziValue = `Etichetta Nazionale (Italia): €1.50\nEtichetta Internazionale: €2.50`;
        const controllaValue = `Prima di richiedere una spedizione, controlla il canale <#1347931851481808959> per assicurarti che la destinazione sia supportata.`;
        const notaValue = `Le etichette sono valide solo per le destinazioni elencate nel canale.\nSe hai dubbi, apri un ticket o contatta lo staff.`;


        // --- Costruisci l'Embed ---
        const spedizioneEmbed = new EmbedBuilder()
            .setColor('#FFA500') // Colore dell'embed (arancione)
            .setTitle('Etichette di Spedizione')
            .setDescription(embedDescription)
            .addFields(
                {
                    name: 'Prezzi',
                    value: prezziValue,
                    inline: false
                },
                {
                    name: 'Controlla prima di ordinare',
                    value: controllaValue,
                    inline: false
                },
                {
                    name: 'Nota',
                    value: notaValue, // Il testo della nota include già la frase finale
                    inline: false
                }
            )
            .setTimestamp() // Aggiunge automaticamente la data e l'ora attuali nel footer
            // Il footer è omesso perché l'ultima frase è già nella "Nota" field, come da tua richiesta "esatte parole"
            // Se volessi un footer separato, dovresti spostare la frase dalla Nota al footer e mettere un iconURL.
            ;

        // --- Invia l'Embed nel Canale ---
        await message.channel.send({ embeds: [spedizioneEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed spedizione:', error));
    },
};