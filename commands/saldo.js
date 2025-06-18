const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Mostra il tuo saldo crediti o quello di un altro utente (solo admin).')
        .addUserOption(option =>
            option.setName('utente')
                .setDescription('Utente di cui visualizzare il saldo (solo admin)')
                .setRequired(false)
        )
        .setDMPermission(false),

    async execute({ interaction, client, config, dataStore }) { // Aggiunto dataStore
        const { CURRENCY, ADMIN_ROLES_IDS = [] } = config;

        const invoker = interaction.user;
        const target = interaction.options.getUser('utente');
        const guild = interaction.guild;
        let userToShow = invoker; // L'utente di cui mostrare il saldo
        let isAdmin = false;

        try {
            // Controllo dei ruoli per determinare se l'invoker è un admin
            const member = await guild.members.fetch(invoker.id);
            const userRoleIds = member.roles.cache.map(role => role.id);
            isAdmin = ADMIN_ROLES_IDS.some(id => userRoleIds.includes(id));
        } catch (err) {
            console.warn('⚠️ Errore durante il controllo dei ruoli in /saldo:', err);
            // Se c'è un errore nel controllo ruoli, per sicurezza non considerarlo admin
            isAdmin = false;
        }

        // Se è stato specificato un target e l'invoker non è un admin
        if (target && target.id !== invoker.id && !isAdmin) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription('❌ Non hai i permessi per visualizzare il saldo di altri utenti.');
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true }); // flags: 64 è deprecato
        }

        userToShow = target || invoker; // Se target è null, usa invoker

        let balance = 0; // Inizializza il saldo a 0

        try {
            // Recupera il saldo crediti dal database usando il dataStore
            balance = await dataStore.getUserCredits(userToShow.id);
        } catch (error) {
            console.error(`Errore nel recupero saldo per ${userToShow.id}:`, error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il recupero del saldo. Riprova più tardi.");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('💰 Saldo Crediti')
            .setDescription(`${userToShow} ha **${balance.toFixed(2)}${CURRENCY}** disponibili.`);

        await interaction.reply({
            embeds: [embed],
            ephemeral: true // flags: 64 è deprecato
        });
    }
};