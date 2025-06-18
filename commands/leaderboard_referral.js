const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard_referral')
        .setDescription('Mostra la classifica degli utenti con più referral.')
        .setDMPermission(false), // Questo comando dovrebbe funzionare solo nei server

    // Rimuoviamo 'client' e 'config' se non sono usati, teniamo 'dataStore'
    async execute({ interaction, client, dataStore }) {
        try {
            // Eseguiamo una query SQL per contare i referral per ogni proprietario di codice
            const result = await dataStore.db.query(`
                SELECT
                    rc.owner_id,
                    COUNT(ru.user_id) AS referral_count
                FROM
                    referral_codes rc
                JOIN
                    referred_users ru ON rc.code = ru.referred_by_code
                GROUP BY
                    rc.owner_id
                ORDER BY
                    referral_count DESC
                LIMIT 10;
            `);

            const sortedReferrers = result.rows; // Ora `sortedReferrers` contiene direttamente i dati ordinati dal DB

            if (sortedReferrers.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#FFFF00")
                    .setDescription("Non ci sono ancora referral registrati. Invita i tuoi amici!");
                return interaction.reply({ embeds: [embed], ephemeral: true }); // flags: 64 è deprecato
            }

            let description = "🏆 **Classifica Referral (Top 10)** 🏆\n\n";
            let rank = 1;

            for (const row of sortedReferrers) {
                const referrerId = row.owner_id;
                const count = row.referral_count;

                const user = await client.users.fetch(referrerId).catch(() => null);
                const username = user?.username ?? `Utente Sconosciuto (${referrerId})`;
                description += `**${rank}.** ${username} - **${count}** referral\n`;
                rank++;
            }

            const embed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle("Classifica Referrals")
                .setDescription(description)
                .setFooter({ text: 'Invita più amici per salire in classifica!' });

            return interaction.reply({ embeds: [embed], ephemeral: true }); // flags: 64 è deprecato
        } catch (error) {
            console.error('Errore nel comando /leaderboard_referral:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante la creazione della classifica referral. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};