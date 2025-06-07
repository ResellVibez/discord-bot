const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'promo', // Il comando per inviare questo embed
        description: 'Mostra l\'embed delle promozioni e ricariche.',
        staffOnly: true, // Questo comando è solo per lo staff
    },
    async execute(message, args, client, saveCredits, config) {
        const { STAFF_ROLES } = config; // Ho rimosso le altre variabili config non più necessarie qui

        // --- Verifica Permessi Staff ---
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
        if (!isStaff) {
            await message.delete().catch(() => {});
            return;
        }

        // --- Elimina il Messaggio del Comando (per staff) ---
        await message.delete().catch(() => {});

        // --- Testo Completo dell'Annuncio (come unica descrizione) ---
        // Ho incluso tutti i dettagli e la formattazione direttamente qui.
        const fullAnnouncementDescription = `
Ciao a tutti! Siamo entusiasti di annunciarvi che abbiamo finalmente **introdotto un sistema di crediti** sul nostro server! Questo nuovo sistema è pensato per darvi un valore aggiunto e nuove possibilità di interazione.

Potrete ottenere crediti con **ricariche speciali** che includono bonus esclusivi. Più ricaricate, più crediti bonus riceverete!

💰 **Ecco le tariffe di ricarica con bonus disponibili:**
* **15€** +10% di Crediti Bonus = **16.50€** di crediti totali!
* **30€** +15% di Crediti Bonus = **34.50€** di crediti totali!
* **50€** +20% di Crediti Bonus = **60.00€** di crediti totali!
* **100€** +30% di Crediti Bonus = **130.00€** di crediti totali!
* **200€** +50% di Crediti Bonus = **300.00€** di crediti totali!

Come funziona? Semplice! Quando ricaricate uno degli importi specificati, il bonus verrà aggiunto automaticamente al vostro saldo crediti.

⚙️ **Comandi a vostra disposizione:**
* \`!saldo\`: Mostra il tuo saldo crediti attuale.

**🗣️ La vostra opinione conta!**
Se avete proposte o idee per nuove tariffe di ricarica ragionevoli, o per l'utilizzo futuro dei crediti, non esitate a scriverci aprendo un ticket sul server! Siamo sempre aperti al vostro feedback per migliorare l'esperienza.

Per ricaricare o per qualsiasi altra domanda, contattate un membro del team <@&1358074842834014269>!

Grazie per il vostro supporto e buon divertimento con i vostri crediti!
        `.trim(); // .trim() rimuove spazi vuoti iniziali e finali.

        // --- Costruisci l'Embed ---
        const ricaricaEmbed = new EmbedBuilder()
            .setColor('#00FFFF') // Colore dell'embed (ciano brillante)
            .setAuthor({
                name: 'CreditBot', // Nome che appare sopra il titolo
                iconURL: client.user.displayAvatarURL() // URL dell'avatar del tuo bot
            })
            // Il titolo dell'embed sarà la prima riga evidenziata del tuo testo
            .setTitle('✨ NOVITÀ: Sistema di Crediti Ufficialmente Introdotto! ✨') 
            .setDescription(fullAnnouncementDescription) // Tutta la formattazione è gestita qui dentro
            .setTimestamp() // Aggiunge automaticamente la data e l'ora attuali nel footer
            .setFooter({
                text: 'Contattate lo staff per le ricariche.',
                iconURL: 'https://i.imgur.com/Q2yD79a.png' // Icona di un punto interrogativo. Sostituisci se hai un URL migliore.
            });

        // --- Invia l'Embed nel Canale ---
        await message.channel.send({ embeds: [ricaricaEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed promo:', error));
    },
};