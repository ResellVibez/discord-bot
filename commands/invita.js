const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto'); // Per generare codici casuali

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invita')
        .setDescription('Genera e mostra il tuo codice referral personale')
        .setDMPermission(false), // Questo comando dovrebbe funzionare solo nei server

    async execute({ interaction, client, dataStore, config }) {
        // ERROR_MESSAGE_TIMEOUT_MS non è più necessario qui, in quanto si usano embed effimeri
        // const { ERROR_MESSAGE_TIMEOUT_MS = 10000 } = config; // Rimosso

        const userId = interaction.user.id;
        const username = interaction.user.username; // Per l'embed

        try {
            let referralCode = null;

            // 1. Controlla se l'utente ha già un codice referral nel database
            const existingCodeResult = await dataStore.db.query(
                'SELECT code FROM referral_codes WHERE owner_id = $1',
                [userId]
            );

            if (existingCodeResult.rows.length > 0) {
                // L'utente ha già un codice
                referralCode = existingCodeResult.rows[0].code;
            } else {
                // L'utente non ha un codice, generane uno nuovo e salvalo
                let isCodeUnique = false;
                let generatedCode;

                // Loop per assicurarsi che il codice generato sia unico
                while (!isCodeUnique) {
                    generatedCode = crypto.randomBytes(3).toString("hex").toUpperCase();
                    const checkUnique = await dataStore.db.query(
                        'SELECT code FROM referral_codes WHERE code = $1',
                        [generatedCode]
                    );
                    if (checkUnique.rows.length === 0) {
                        isCodeUnique = true;
                    }
                }

                // Salva il nuovo codice nel database
                const success = await dataStore.createReferralCode(generatedCode, userId); // Usa il metodo di DataStore
                if (!success) {
                    throw new Error("Errore nel salvare il codice referral nel database.");
                }
                referralCode = generatedCode;
            }

            const embed = new EmbedBuilder()
                .setColor("#3498db")
                .setTitle("🤝 Il tuo Codice Referral")
                .setDescription(
                    `Ciao **${username}**!\n\n` +
                    `🔗 Il tuo codice referral personale è: \`${referralCode}\`\n\n` +
                    `Condividilo con i tuoi amici! Quando un amico si iscrive e ricarica almeno **15€**, tu riceverai un bonus speciale.\n\n` +
                    `➡️ Per usare un codice: \`/referral\`\n` + // Assicurati che esista un comando /referral per riscattare
                    `🏆 Per vedere la classifica referral: \`/leaderboard_referral\``
                );

            await interaction.reply({
                embeds: [embed],
                ephemeral: true // flags: 64 è deprecato, usa ephemeral: true
            });

        } catch (error) {
            console.error(`Errore nel comando /invita per ${userId}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante la generazione/recupero del codice referral. Riprova più tardi.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};