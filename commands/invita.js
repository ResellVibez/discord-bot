const { EmbedBuilder } = require('discord.js');
const crypto = require('crypto'); // Necessario per generare codici casuali

module.exports = {
    data: {
        name: 'invita',
        description: 'Ottieni il tuo codice di invito personale per far guadagnare te e i tuoi amici.',
        // Questo comando non è staffOnly
    },
    async execute(message, args, client, saveCredits, saveReferralData, config) {
        const { PREFIX, ERROR_MESSAGE_TIMEOUT_MS } = config;

        // Elimina il messaggio del comando dell'utente per pulizia
        await message.delete().catch(() => {});

        const userId = message.author.id;
        let userReferralCode = client.referralData.referralCodes[userId];

        // Se l'utente non ha ancora un codice referral, ne generiamo uno
        if (!userReferralCode) {
            // Genera un codice alfanumerico di 6 caratteri
            // È importante assicurarsi che il codice sia unico.
            // In un ambiente di produzione, si potrebbe voler ciclare e rigenerare
            // finché non si trova un codice non usato, o usare un sistema più robusto.
            // Per ora, una generazione casuale è sufficiente per iniziare.
            userReferralCode = crypto.randomBytes(3).toString('hex').toUpperCase(); // Es: B4A3F2C1 (6 caratteri)

            // Salva il nuovo codice associato all'ID dell'utente
            client.referralData.referralCodes[userId] = userReferralCode;
            await saveReferralData(); // Salva i dati aggiornati dei referral
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00') // Verde per successo/informazione
            .setTitle('🔗 Il Tuo Codice di Invito Personale!')
            .setDescription( // <-- ASSICURATI CHE QUESTA STRINGA SIA TRA BACKTICK
                `Condividi questo codice con i tuoi amici per farli entrare in ShipX!\n\n` +
                `**Il tuo codice:** \`${userReferralCode}\`\n\n` +
                `Quando un tuo amico userà il tuo codice con \`${PREFIX}referral ${userReferralCode}\` e farà la sua **prima ricarica**, tu riceverai un bonus di **<span class="math-inline">\{config\.REFERRAL\_BONUS\_AMOUNT\.toFixed\(2\)\}</span>{config.CURRENCY}**!`
            ) // <-- E CHE FINISCA CON UN BACKTICK
            .setFooter({ text: 'Incentiva i tuoi amici a unirsi e a ricaricare per guadagnare!' });

        // Invia l'embed al canale
        await message.channel.send({ embeds: [embed] })
            .then(msg => setTimeout(() => msg.delete().catch(() => {}), ERROR_MESSAGE_TIMEOUT_MS * 3)); // Rimane visibile più a lungo
    },
};