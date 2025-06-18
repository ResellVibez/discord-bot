const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkspedizioni')
        .setDescription('Mostra il numero di spedizioni gratuite disponibili per te o per un altro utente (solo admin).')
        .addUserOption(option =>
            option.setName('utente')
                .setDescription('Utente di cui vuoi vedere le spedizioni (solo per admin)')
                .setRequired(false)
        )
        .setDMPermission(false),
        // Non è necessario setDefaultMemberPermissions qui a meno che tu non voglia
        // che il comando sia visibile solo agli admin in generale.
        // La logica interna già controlla chi può vedere gli altri utenti.

    async execute({ interaction, client, config, dataStore }) { // dataStore è già disponibile
        const { ADMIN_ROLES_IDS = [] } = config;

        const invoker = interaction.user;
        const target = interaction.options.getUser('utente');
        const guild = interaction.guild;

        let userToCheck = invoker;
        let isAdmin = false;

        // Controllo se l'utente che esegue il comando è un admin
        try {
            const member = await guild.members.fetch(invoker.id);
            const roleIds = member.roles.cache.map(r => r.id);
            isAdmin = ADMIN_ROLES_IDS.some(id => roleIds.includes(id));
        } catch (err) {
            console.warn('Errore nel controllo ruoli per /checkspedizioni:', err);
        }

        // Se è stato specificato un utente target e l'invoker non è admin
        if (target && !isAdmin) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Non hai i permessi per controllare le spedizioni di altri utenti.");
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true }); // flags: 64 è deprecato
        }

        userToCheck = target || invoker; // L'utente da controllare è il target o l'invoker stesso

        let freeShippingsCount = 0; // Inizializza a 0

        try {
            // Recupera il numero di spedizioni gratuite dal database
            freeShippingsCount = await dataStore.getUserFreeShippings(userToCheck.id);

        } catch (error) {
            console.error(`Errore nel recupero spedizioni gratuite per ${userToCheck.id}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero delle spedizioni gratuite. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }


        const embed = new EmbedBuilder()
            .setColor("#0099FF")
            .setTitle("📦 Spedizioni Gratuite")
            .setDescription(`${userToCheck} ha **\`${freeShippingsCount}\`** spedizion${freeShippingsCount === 1 ? 'e' : 'i'} gratuita${freeShippingsCount === 1 ? '' : 'e'}.`)
            .setFooter({ text: `Richiesto da ${invoker.tag}` });

        // Risponde ephemerally se l'utente non è un admin e sta controllando se stesso,
        // altrimenti visibile (o sempre ephemeral per staff)
        return interaction.reply({ embeds: [embed], ephemeral: true }); // Flags 64 replaced with ephemeral: true
    },
};