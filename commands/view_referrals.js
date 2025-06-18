const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('view_referrals')
        .setDescription('Mostra gli utenti referenziati e i loro referrer (solo admin).')
        .addUserOption(option =>
            option.setName('referrer')
                .setDescription('Utente da filtrare come referrer')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Solo chi può gestire il server può usare questo comando
        .setDMPermission(false),

    async execute({ interaction, client, dataStore }) { // Aggiunto dataStore
        const refFilter = interaction.options.getUser('referrer'); // Utente per filtrare i referral
        const filterReferrerId = refFilter ? refFilter.id : null; // ID del referrer da filtrare

        // ✅ Risposta immediata per evitare InteractionNotReplied
        await interaction.reply({ content: '📨 Generazione del report referral in corso...', ephemeral: true }); // flags: 64 è deprecato

        try {
            let query = `
                SELECT
                    ru.user_id,
                    rc.owner_id AS referrer_id,
                    ru.referral_bonus_given -- Assicurati che questa colonna esista in 'referred_users'
                FROM
                    referred_users ru
                JOIN
                    referral_codes rc ON ru.referred_by_code = rc.code
            `;
            const queryParams = [];

            if (filterReferrerId) {
                query += ` WHERE rc.owner_id = $1`;
                queryParams.push(filterReferrerId);
            }

            query += ` ORDER BY ru.user_id;`; // Ordina per coerenza

            const result = await dataStore.db.query(query, queryParams);
            const entries = result.rows; // Le righe contengono user_id, referrer_id, referral_bonus_given

            if (entries.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setDescription(`⚠️ Nessun utente referenziato${refFilter ? ` da ${refFilter.tag}` : ''}.`);
                return interaction.followUp({ embeds: [embed], ephemeral: true });
            }

            const chunks = [];
            let current = "";

            for (const data of entries) {
                const referredId = data.user_id;
                const referrerId = data.referrer_id;
                const bonusGiven = data.referral_bonus_given; // Usa la colonna corretta

                const referred = await client.users.fetch(referredId).catch(() => null);
                const referrer = await client.users.fetch(referrerId).catch(() => null);

                const referredTag = referred ? referred.tag : `ID: ${referredId}`;
                const referrerTag = referrer ? referrer.tag : `ID: ${referrerId}`;
                const status = bonusGiven ? "✅ Dato" : "❌ Non Dato";

                const line = `• **Utente:** ${referredTag}\n  **Referenziato da:** ${referrerTag}\n  **Bonus:** ${status}\n\n`;

                // Logica per chunkare l'embed in caso di molti referral
                // (assicurarsi che la descrizione non superi i 4096 caratteri)
                if ((current + line).length > 3500) { // Ridotto il limite per maggiore sicurezza, max 4096 per embed description
                    chunks.push(current);
                    current = line;
                } else {
                    current += line;
                }
            }
            if (current.length > 0) chunks.push(current);

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle(`📜 Utenti Referenziati${refFilter ? ` da ${refFilter.tag}` : ''}${chunks.length > 1 ? ` (parte ${i + 1})` : ''}`)
                    .setDescription(chunks[i])
                    .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

                // Usa followUp per inviare messaggi successivi alla prima risposta differita
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            console.error('Errore nel comando /view_referrals:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero dei referral. Riprova più tardi.");
            // Usa followUp per l'errore se la prima risposta è già stata inviata
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};