const { EmbedBuilder } = require("discord.js");

module.exports = {
    data: {
        name: 'saldo',
        description: 'Mostra il saldo dei crediti tuo o di un altro utente.',
    },
    async execute(message, args, client, saveCredits, config) {
        const { CURRENCY } = config;
        const targetUser = message.mentions.users.first() || message.author;
        const balance = client.userCredits[targetUser.id] || 0;

        const embed = new EmbedBuilder()
            .setColor("#00FFFF")
            .setDescription(
                `💰 Saldo ${targetUser.toString()}: **${balance.toFixed(2)}${CURRENCY}**`,
            );

        return message.reply({ embeds: [embed] });
    },
};