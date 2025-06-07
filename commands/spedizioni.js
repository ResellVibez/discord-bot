const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'spedizione',
        description: 'Mostra informazioni sulle etichette di spedizione.',
        // Questo comando è accessibile a TUTTI gli utenti
    },
    async execute(message, args, client, saveCredits, config) {
        await message.delete().catch(() => {});

        const spedizioneEmbed = new EmbedBuilder()
            .setColor('#FF8C00') // Un arancione più intenso
            .setTitle('📦 Etichette di Spedizione') // Aggiunta emoji pacco al titolo
            .setDescription('Benvenuto nel nostro servizio di etichette di spedizione! Offriamo soluzioni semplici e a prezzo fisso per i tuoi pacchi fino a 2 kg, indipendentemente dal peso esatto (0.5 kg, 1 kg o 2 kg).') // Descrizione più accattivante
            .addFields(
                {
                    name: '💰 Prezzi', // Aggiunta emoji a prezzi
                    value: 'Etichetta Nazionale (Italia): **€1.50**\nEtichetta Internazionale: **€2.50**', // Prezzi in grassetto
                    inline: false
                },
                {
                    name: '👀 Controlla prima di ordinare', // Aggiunta emoji occhio
                    value: 'Prima di richiedere una spedizione, controlla il canale <#1347931851481808959> per assicurarti che la destinazione sia supportata.',
                    inline: false
                },
                {
                    name: '💡 Nota Importante', // Aggiunta emoji lampadina
                    value: 'Le etichette sono valide solo per le destinazioni elencate nel canale.',
                    inline: false
                }
            )
            .setTimestamp() // Aggiunge data e ora
            .setFooter({
                text: 'Per qualsiasi dubbio o domanda, apri un ticket o contatta lo staff.', // Messaggio spostato nel footer
                iconURL: client.user.displayAvatarURL() // Icona del bot nel footer per coerenza
            });

        await message.channel.send({ embeds: [spedizioneEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed spedizione:', error));
    },
};