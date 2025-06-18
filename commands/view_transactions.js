const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    MessageFlags
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

    async execute({ interaction, client, config, dataStore }) {
        const { CURRENCY } = config;
        const DEFAULT_LIMIT = 5;
        const targetUser = interaction.options.getUser("utente");
        const limit = interaction.options.getInteger("limite") || DEFAULT_LIMIT;

        try {
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
                whereClauses.push(`user_id = $${paramIndex++}`);
                queryParams.push(targetUser.id);
            }

            if (whereClauses.length > 0) {
                query += ` WHERE ` + whereClauses.join(' AND ');
            }

            query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++};`;
            queryParams.push(limit);

            const result = await dataStore.db.query(query, queryParams);
            const transactionsToShow = result.rows;

            if (transactionsToShow.length === 0) {
                const noTxEmbed = new EmbedBuilder()
                    .setColor("#FFD700")
                    .setDescription(`⚠️ Nessuna transazione trovata${targetUser ? ` per ${targetUser.tag}` : ''}.`);
                return interaction.reply({ embeds: [noTxEmbed], ephemeral: true });
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

                // *** MODIFICA QUI: Parsa tx.amount a un numero ***
                const parsedAmount = parseFloat(tx.amount); // Converti la stringa in un numero float

                switch (tx.type) {
                    case "riscatto_spedizione_gratuita":
                        title = `📦 Riscatto Spedizione`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo accreditato:** ${parsedAmount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "ricarica_crediti":
                        title = `💳 Ricarica Crediti`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Finale:** ${parsedAmount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "bonus_referral_ricevuto":
                        title = `🎉 Bonus Referral`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Bonus:** ${parsedAmount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "rimozione_crediti":
                        title = `➖ Rimozione Crediti`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Rimosso:** ${(-parsedAmount).toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    case "crediti_spesi":
                        title = `💸 Crediti Spesi`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo Speso:** ${(-parsedAmount).toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                    default:
                        title = `ℹ️ Transazione Generica (${tx.type})`;
                        description = `**Utente:** <@${tx.user_id}>\n**Importo:** ${parsedAmount.toFixed(2)}${CURRENCY}\n${tx.description}`;
                        break;
                }
                
                embed.addFields({
                    name: `${title} (${date})`,
                    value: description,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Errore nel comando /view_transactions:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero delle transazioni. Riprova più tardi.");
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
        }
    }
};