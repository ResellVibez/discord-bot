const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aggiungi') // Slash command name
        .setDescription('Aggiunge un importo specifico ai crediti di un utente.')
        .addUserOption(option => // Add option for the target user
            option.setName('utente')
                .setDescription('L\'utente a cui aggiungere i crediti.')
                .setRequired(true)
        )
        .addNumberOption(option => // Add option for the amount
            option.setName('importo')
                .setDescription('L\'importo da aggiungere.')
                .setRequired(true)
                .setMinValue(0.01) // Optional: ensure the amount is positive
        )
        // Set default permissions at the Discord level (only administrators can see/use it)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Or PermissionFlagsBits.ManageGuild if you prefer a broader permission set

    async execute({ interaction, client, config, saveCredits }) {
        const { CURRENCY, ADMIN_ROLES_IDS, ERROR_MESSAGE_TIMEOUT_MS } = config;

        // The permission check below becomes partially redundant thanks to setDefaultMemberPermissions,
        // but it's still good practice to keep it for a double-check or if Discord permissions
        // are not perfectly configured (e.g., if you deploy globally and then set role overrides).
        const member = interaction.member;
        const adminRoles = ADMIN_ROLES_IDS || [];
        const memberRoles = member.roles.cache.map(role => role.id);
        const isAuthorized = adminRoles.some(roleId => memberRoles.includes(roleId));

        if (!isAuthorized) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Non hai i permessi per usare questo comando.");
            // For slash commands, reply ephemerally (only you see the message)
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

        // Retrieve arguments from slash command options
        const targetUser = interaction.options.getUser('utente');
        const amount = interaction.options.getNumber('importo');

        // Input validation for amount <= 0 could be handled by .setMinValue(0.01) above
        // but an additional check doesn't hurt.
        if (amount <= 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription(`❌ L'importo deve essere un numero positivo.`);
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        client.userCredits[targetUser.id] = (client.userCredits[targetUser.id] || 0) + amount;
        await saveCredits(client.userCredits);


        const successEmbed = new EmbedBuilder()
            .setColor("#00FF00")
            .setDescription(`⚡ ${targetUser.toString()} ha ricevuto **${amount.toFixed(2)}${CURRENCY}** (credito diretto)`) // Corrected template literal
            .addFields({
                name: "Nuovo saldo",
                value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`, // Corrected template literal
                inline: true,
            });

        // Reply to the slash command. Not ephemeral for success.
        return interaction.reply({ embeds: [successEmbed] });
    },
};