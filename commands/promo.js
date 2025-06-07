const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'promo', // Il comando sarà !promo
        description: 'Mostra l\'embed delle promozioni e ricariche.',
        staffOnly: true, // Indica che questo comando è solo per lo staff
    },
    async execute(message, args, client, saveCredits, config) {
        const { CURRENCY, TIERED_AMOUNTS, BONUS_RATES, STAFF_ROLES } = config;

        // --- Verifica Permessi Staff ---
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
        if (!isStaff) {
            // Se non è staff, elimina il comando dell'utente e non fa nulla.
            await message.delete().catch(() => {});
            return;
        }

        // --- Elimina il Messaggio del Comando (per staff) ---
        // Questo fa sì che il comando !promo venga eliminato dopo l'uso
        await message.delete().catch(() => {});

        // --- Costruisci il Contenuto Dinamico per "COSTI & BONUS" ---
        let costiBonusValue = '';
        TIERED_AMOUNTS.forEach(amount => {
            const bonusRate = BONUS_RATES[amount.toString()]; // Le chiavi di BONUS_RATES sono stringhe
            const total = amount * bonusRate;
            const bonusPercentage = ((bonusRate - 1) * 100).toFixed(0);
            // Formatta ogni riga
            costiBonusValue += `${amount}${CURRENCY} +${bonusPercentage}% Crediti Bonus = **${total.toFixed(2)}${CURRENCY}**\n`;
        });

        // --- Costruisci l'Embed ---
        const ricaricaEmbed = new EmbedBuilder()
            .setColor('#00FFFF') // Colore dell'embed (ciano brillante)
            .setAuthor({
                name: 'CreditBot', // Nome che appare sopra il titolo (puoi usare client.user.username per il nome del bot)
                iconURL: client.user.displayAvatarURL() // URL dell'avatar del tuo bot
            })
            .setTitle('RICARICA CREDITI')
            .setDescription('Ricarica qui i tuoi crediti e goditi i bonus esclusivi!')
            .addFields(
                { name: 'METODI DI PAGAMENTO', value: 'PayPal', inline: false },
                {
                    name: 'COSTI & BONUS',
                    value: costiBonusValue.trim(), // .trim() per rimuovere l'ultima nuova linea extra
                    inline: false
                }
            )
            .setTimestamp() // Aggiunge automaticamente la data e l'ora attuali nel footer
            .setFooter({
                text: 'Contattate lo staff per le ricariche.',
                iconURL: 'https://i.imgur.com/Q2yD79a.png' // Icona di un punto interrogativo. Puoi sostituirla con l'URL di un'icona a tua scelta.
            });

        // --- Invia l'Embed nel Canale ---
        await message.channel.send({ embeds: [ricaricaEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed promo:', error));
    },
};