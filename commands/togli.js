const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togli')
        .setDescription('Toglie un importo specifico dai crediti di un utente.')
        .addUserOption(option =>
            option.setName('utente')
                .setDescription('L\'utente a cui togliere i crediti.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('importo')
                .setDescription('L\'importo da togliere.')
                .setRequired(true)
                .setMinValue(0.01) // Assicura che l'importo sia positivo
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Solo gli amministratori possono usare questo comando
        .setDMPermission(false),

    async execute({ interaction, client, config, dataStore }) { // Aggiunto dataStore, rimosso saveCredits
        const { CURRENCY, ADMIN_ROLES_IDS = [] } = config;

        const invoker = interaction.user; // Colui che esegue il comando
        const targetUser = interaction.options.getUser('utente'); // Utente a cui togliere i crediti
        const amount = interaction.options.getNumber('importo'); // Importo da togliere
        const userId = targetUser.id; // ID dell'utente target

        // Il setDefaultMemberPermissions(PermissionFlagsBits.Administrator) sopra
        // dovrebbe già gestire i permessi. Questo controllo extra è una buona pratica
        // se ci fosse la possibilità che il comando possa essere usato da non-admin
        // o se ADMIN_ROLES_IDS include ruoli meno restrittivi.
        // Per ora, lo lasciamo per coerenza con il codice originale.
        const member = interaction.member;
        const userRoles = member.roles.cache.map(role => role.id);
        const isAuthorized = ADMIN_ROLES_IDS.some(id => userRoles.includes(id));

        if (!isAuthorized) {
            return interaction.reply({
                content: "❌ Non hai i permessi per usare questo comando.",
                flags: MessageFlags.Ephemeral // Messaggio visibile solo a chi lo ha invocato
            });
        }

        try {
            // 1. Recupera il saldo attuale dal database
            const currentBalance = await dataStore.getUserCredits(userId);

            if (currentBalance < amount) {
                const insufficientCreditsEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setDescription(
                        `❌ **Credito insufficiente!**\nSaldo attuale: **${currentBalance.toFixed(2)}${CURRENCY}**`
                    );
                return interaction.reply({ embeds: [insufficientCreditsEmbed], ephemeral: true }); // MessageFlags.Ephemeral è deprecato in favore di ephemeral: true
            }

            // 2. Rimuovi i crediti usando il metodo del DataStore
            const success = await dataStore.removeCredits(userId, amount);

            if (!success) {
                throw new Error("Errore durante la rimozione dei crediti.");
            }

            // 3. Recupera il nuovo saldo per la visualizzazione
            const newBalance = await dataStore.getUserCredits(userId);

            // 4. Registra la transazione di rimozione crediti
            await dataStore.addTransaction(
                userId,
                'rimozione_crediti',
                -amount, // L'importo rimosso è negativo per la transazione
                `Rimozione di ${amount.toFixed(2)}${CURRENCY} da parte di ${invoker.tag}.`
            );


            const embed = new EmbedBuilder()
                .setColor("#FFA500")
                .setDescription(`📦 **Tolti ${amount.toFixed(2)}${CURRENCY}** da ${targetUser.toString()}`)
                .addFields({
                    name: "Nuovo saldo",
                    value: `${newBalance.toFixed(2)}${CURRENCY}`,
                    inline: true
                });

            return interaction.reply({ embeds: [embed] }); // Non ephemerally, per farla vedere allo staff
        } catch (error) {
            console.error(`Errore nel comando /togli per ${userId}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante la rimozione dei crediti. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};