const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_referral')
        .setDescription('Mostra le informazioni referral di un utente (Staff).')
        .addUserOption(option =>
            option.setName('utente')
                .setDescription('Utente da controllare')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute({ interaction, config, dataStore }) { // dataStore è già disponibile
        const { CURRENCY, MIN_RECHARGE_FOR_REFERRAL_BONUS } = config;

        const targetUser = interaction.options.getUser('utente');
        const targetUserId = targetUser.id;

        let description = `**Informazioni Referral per ${targetUser.toString()}:**\n\n`;

        try {
            // 1. Recupera il codice referral generato da questo utente (se esiste)
            // Query per trovare un codice di cui l'utente è il proprietario
            const userOwnedCodeResult = await dataStore.db.query(
                'SELECT code, uses FROM referral_codes WHERE owner_id = $1',
                [targetUserId]
            );
            const userOwnedCode = userOwnedCodeResult.rows[0]; // Prende il primo (e dovrebbe essere l'unico)

            if (userOwnedCode) {
                description += `**Codice Invito Generato:** \`${userOwnedCode.code}\`\n`;

                // 2. Conta quanti utenti sono stati referenziati DA questo codice
                const referredCountResult = await dataStore.db.query(
                    'SELECT COUNT(*) AS count FROM referred_users WHERE referred_by_code = $1',
                    [userOwnedCode.code]
                );
                const referredCount = referredCountResult.rows[0]?.count || 0;
                description += `**Utenti Referenziati da te:** ${referredCount}\n`;
                description += `**Usi Registrati del tuo codice:** ${userOwnedCode.uses}\n`; // "uses" dal DB

            } else {
                description += "Non ha generato un codice di invito.\n";
            }

            description += "\n";

            // 3. Controlla se questo utente è stato referenziato DA QUALCUNO
            const referredInfoResult = await dataStore.db.query(
                'SELECT referred_by_code, claimed_free_shipping FROM referred_users WHERE user_id = $1',
                [targetUserId]
            );
            const referredInfo = referredInfoResult.rows[0];

            if (referredInfo) {
                // Recupera l'owner_id del codice referral che ha referenziato questo utente
                const referrerCodeOwnerResult = await dataStore.db.query(
                    'SELECT owner_id FROM referral_codes WHERE code = $1',
                    [referredInfo.referred_by_code]
                );
                const referrerId = referrerCodeOwnerResult.rows[0]?.owner_id;

                description += `**Referenziato da:** ${referrerId ? `<@${referrerId}> (\`${referredInfo.referred_by_code}\`)` : `Codice: \`${referredInfo.referred_by_code}\` (Proprietario sconosciuto)`}\n`;
                description += `**Spedizione Gratuita Riscattata:** ${referredInfo.claimed_free_shipping ? '✅ Sì' : '❌ No'}\n`;
                // NOTA: Il "Bonus Referral Dato" nel tuo vecchio codice era probabilmente legato al fatto che il referenziato avesse fatto la ricarica minima.
                // Questa logica deve essere implementata separatamente (es. come transazione).
                // Per ora, non posso dedurre automaticamente se il bonus è stato dato solo dal DB.
                // Se hai una colonna specifica per "bonus_given" nella tabella referred_users, possiamo usarla.
                // Altrimenti, questa riga va gestita o rimossa se non rilevante dal DB.
                // description += `**Bonus Referral Dato:** ${referredInfo.bonusGiven ? '✅ Sì' : `❌ No (serve ricarica ≥ ${MIN_RECHARGE_FOR_REFERRAL_BONUS.toFixed(2)}${CURRENCY})`}\n`;

            } else {
                description += "Non è stato referenziato da nessuno.\n";
            }

            const embed = new EmbedBuilder()
                .setColor("#0099FF")
                .setTitle("🔍 Dettagli Referral Utente")
                .setDescription(description)
                .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true // flags: 64 è deprecato, usa ephemeral: true
            });

        } catch (error) {
            console.error(`Errore nel comando /check_referral per ${targetUserId}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero delle informazioni referral. Riprova più tardi.");
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};