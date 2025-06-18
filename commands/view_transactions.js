const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags // Mantenuto per il riferimento a `ephemeral: true`
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("view_transactions")
        .setDescription("Mostra le ultime transazioni (solo admin).")
        .addUserOption(option =>
            option.setName("utente")
                .setDescription("Utente per cui mostrare le transazioni")
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName("limite")
                .setDescription("Numero massimo di transazioni da mostrare (max 20)")
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute({ interaction, client, config, dataStore }) { // Aggiunto dataStore
        const { CURRENCY } = config;
        const DEFAULT_LIMIT = 5;
        const targetUser = interaction.options.getUser("utente"); // Utente per cui filtrare
        const limit = interaction.options.getInteger("limite") || DEFAULT_LIMIT;

        try {
            // Prepara la query base per le transazioni
            let query = `
                SELECT
                    id, user_id, type, amount, description, timestamp
                FROM
                    transactions
            `;
            const queryParams = [];
            let whereClauses = [];
            let paramIndex = 1;

            if (targetUser) {
                // Filtra per user_id. La tua implementazione originale filtrava su tx.targetUserId, tx.userId, tx.staffId, tx.referrerId.
                // Nel nuovo schema 'transactions', 'user_id' è la colonna principale per l'utente coinvolto.
                // Se hai bisogno di filtrare per staff_id o referrer_id in transazioni specifiche,
                // dovrai aggiungere quelle colonne alla tabella transactions o adattare la logica qui.
                // Per semplicità, ipotizziamo che 'user_id' sia l'utente principale della transazione.
                whereClauses.push(`user_id = $${paramIndex++}`);
                queryParams.push(targetUser.id);
            }

            if (whereClauses.length > 0) {
                query += ` WHERE ` + whereClauses.join(' AND ');
            }

            query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++};`; // Ordina per data decrescente e limita
            queryParams.push(limit);

            const result = await dataStore.db.query(query, queryParams);
            const transactionsToShow = result.rows; // Le transazioni ottenute dal DB

            if (transactionsToShow.length === 0) {
                const noTxEmbed = new EmbedBuilder()
                    .setColor("#FFD700")
                    .setDescription(`⚠️ Nessuna transazione trovata${targetUser ? ` per ${targetUser.tag}` : ''}.`);
                return interaction.reply({ embeds: [noTxEmbed], ephemeral: true }); // flags: 64 è deprecato
            }

            const embed = new EmbedBuilder()
                .setColor("#0099FF")
                .setTitle(`📜 Ultime ${transactionsToShow.length} transazioni${targetUser ? ` per ${targetUser.tag}` : ''}`)
                .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

            for (const tx of transactionsToShow) {
                const date = new Date(tx.timestamp).toLocaleString('it-IT', {
                    year: 'numeric', month: 'numeric', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });

                let title = `Transazione`;
                let description = ``;

                // Adatta la descrizione in base al 'type' della transazione
                // Assicurati che i 'type' siano coerenti con quelli salvati da addTransaction
                switch (tx.type) {
                    case "riscatto_spedizione_gratuita":
                        title = `📦 Riscatto Spedizione`;
                        // La colonna 'description' della transazione dovrebbe contenere i dettagli come 'Spedizioni Prima/Dopo'
                        // o dovrai recuperare quei dati in un modo diverso se non sono nella descrizione.
                        // Ho semplificato per ora basandomi sulla descrizione che salvi.
                        description = `**Utente:** <@${tx.user_id}>\n**Importo accreditato:** ${tx.amount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "ricarica_crediti":
                        title = `💳 Ricarica Crediti`;
                        // Qui l'originale usava tx.rechargeAmount, tx.finalAmountAdded, tx.bonusRateApplied, tx.referralBonusGiven, tx.staffUsername, tx.staffId.
                        // Questi campi dovrebbero essere inclusi nella 'description' o aggiunti come colonne separate in 'transactions' se vuoi filtrarli/mostrarli così dettagliati.
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Finale:** ${tx.amount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "bonus_referral_ricevuto":
                        title = `🎉 Bonus Referral`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Bonus:** ${tx.amount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "rimozione_crediti":
                        title = `➖ Rimozione Crediti`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Rimosso:** ${(-tx.amount).toFixed(2)}${CURRENCY}\n${tx.description}`; // amount sarà negativo
                        break;
                    case "crediti_spesi":
                        title = `💸 Crediti Spesi`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Speso:** ${(-tx.amount).toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    default:
                        title = `ℹ️ Transazione Generica (${tx.type})`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo:** ${tx.amount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                }
                
                embed.addFields({
                    name: `${title} (${date})`,
                    value: description,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true }); // flags: 64 è deprecato

        } catch (error) {
            console.error('Errore nel comando /view_transactions:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero delle transazioni. Riprova più tardi.");
            // Assicurati di rispondere all'interazione se non è già stato fatto
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
        }
    }
};