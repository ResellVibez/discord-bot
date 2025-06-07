const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'referral',
        description: 'Dichiara chi ti ha invitato per garantire un bonus al tuo amico!',
        // Questo comando non è staffOnly
    },
    async execute(message, args, client, saveCredits, saveReferralData, config) {
        const { PREFIX, ERROR_MESSAGE_TIMEOUT_MS, CURRENCY } = config;

        // Elimina il messaggio del comando dell'utente per pulizia
        await message.delete().catch(() => {});

        const referredUserId = message.author.id; // L'ID dell'utente che sta usando il comando (il referred)
        const referralCode = args[0] ? args[0].toUpperCase() : null; // Il codice fornito (rende maiuscolo per la ricerca)

        // --- Validazione dell'Input ---
        if (!referralCode) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Rosso per errore
                .setDescription(`❌ Per favore, fornisci il codice di invito del tuo amico. Esempio: \`${PREFIX}referral SHIPX-ABC123\``);
            return message.channel.send({ embeds: [errorEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        // Controlla se l'utente ha già dichiarato un referrer
        if (client.referralData.referredUsers[referredUserId]) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Hai già dichiarato un invitante in precedenza.');
            return message.channel.send({ embeds: [errorEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        // Cerca l'ID dell'utente che possiede il codice di referral fornito
        const referrerId = Object.keys(client.referralData.referralCodes).find(
            key => client.referralData.referralCodes[key] === referralCode
        );

        // Controlla se il codice referral è valido
        if (!referrerId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Codice di invito non valido o non trovato. Controlla e riprova.');
            return message.channel.send({ embeds: [errorEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        // Impedisci l'auto-referral
        if (referrerId === referredUserId) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription('❌ Non puoi invitare te stesso!');
            return message.channel.send({ embeds: [errorEmbed] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS));
        }

        // --- Registrazione del Referral ---
        client.referralData.referredUsers[referredUserId] = {
            referrerId: referrerId,
            hasTriggeredReward: false // Il bonus non è ancora stato erogato
        };
        await saveReferralData(); // Salva i dati aggiornati dei referral

        // Messaggio di successo
        const successEmbed = new EmbedBuilder()
            .setColor('#00FFFF') // Ciano per successo/informazione
            .setTitle('✅ Referral Registrato con Successo!')
            .setDescription(
                `Hai dichiarato di essere stato invitato da **<@${referrerId}>**.\n\n` +
                `Il tuo amico riceverà un bonus di **<span class="math-inline">\{config\.REFERRAL\_BONUS\_AMOUNT\.toFixed\(2\)\}</span>{CURRENCY}** quando effettuerai la tua **prima ricarica di crediti**!`
            )
            .setFooter({ text: 'Grazie per esserti unito a ShipX!' });

        await message.channel.send({ embeds: [successEmbed] })
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS * 3)); // Rimane visibile più a lungo
    },
};