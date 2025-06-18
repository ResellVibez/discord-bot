const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aggiungi')
        .setDescription('Aggiunge un importo specifico ai crediti di un utente.')
        .addUserOption(option =>
            option.setName('utente')
                .setDescription('L\'utente a cui aggiungere i crediti.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('importo')
                .setDescription('L\'importo da aggiungere.')
                .setRequired(true)
                .setMinValue(0.01) // Assicurati che l'importo sia positivo
        )
        // Imposta i permessi a livello di Discord: solo gli amministratori possono vedere/usare questo comando
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Rimuoviamo 'saveCredits' dai parametri, useremo direttamente 'dataStore'
    async execute({ interaction, client, config, dataStore }) { // AGGIUNTO: dataStore
        const { CURRENCY, ADMIN_ROLES_IDS } = config; // Rimosso ERROR_MESSAGE_TIMEOUT_MS perché non usato qui

        // Questo controllo dei permessi è una buona ridondanza, anche se Discord.js lo gestisce già
        const member = interaction.member;
        const adminRoles = ADMIN_ROLES_IDS || [];
        const memberRoles = member.roles.cache.map(role => role.id);
        const isAuthorized = adminRoles.some(roleId => memberRoles.includes(roleId));

        if (!isAuthorized) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Non hai i permessi per usare questo comando.");
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('utente');
        const amount = interaction.options.getNumber('importo');

        if (amount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(`❌ L'importo deve essere un numero positivo.`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        let currentBalance; // Variabile per tenere traccia del saldo prima dell'operazione

        try {
            // 1. Recupera il saldo attuale dell'utente dal database
            currentBalance = await dataStore.getUserCredits(targetUser.id);

            // 2. Aggiungi i crediti usando il metodo addCredits del DataStore
            const success = await dataStore.addCredits(targetUser.id, amount);

            if (!success) {
                throw new Error("Impossibile aggiornare il saldo nel database.");
            }

            // 3. Recupera il NUOVO saldo dopo l'operazione per visualizzarlo correttamente
            const newBalance = await dataStore.getUserCredits(targetUser.id);

            // 4. Registra la transazione
            await dataStore.addTransaction(
                targetUser.id,
                'ricarica_diretta', // Tipo di transazione
                amount,
                `Aggiunta diretta da ${interaction.user.tag}`
            );

            const successEmbed = new EmbedBuilder()
                .setColor("#00FF00")
                .setDescription(`⚡ ${targetUser.toString()} ha ricevuto **${amount.toFixed(2)}${CURRENCY}** (credito diretto)`)
                .addFields({
                    name: "Nuovo saldo",
                    value: `${newBalance.toFixed(2)}${CURRENCY}`,
                    inline: true,
                });

            return interaction.reply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(`Errore nel comando /aggiungi per ${targetUser.id}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante l'aggiunta dei crediti. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};