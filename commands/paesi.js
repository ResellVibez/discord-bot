const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'paesi',
        description: 'Mostra i paesi disponibili per la spedizione con bandiere.',
        staffOnly: true, // <--- AGGIUNTO/MODIFICATO: Solo per lo staff
    },
    async execute(message, args, client, saveCredits, config) {
        const { STAFF_ROLES } = config; // <--- AGGIUNTO: Destruttura STAFF_ROLES

        // --- Verifica Permessi Staff ---
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
let isStaff = false; // Inizializza a false
if (member) { // Aggiungi questo controllo!
    isStaff = member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
}
if (!isStaff) {
    // ... logica per utenti non staff
}
        // --- Fine Verifica Permessi Staff ---

        await message.delete().catch(() => {});

        const embedDescription = `🌍 Il nostro servizio di spedizione porta i tuoi pacchi in giro per il mondo! Attualmente siamo disponibili per le seguenti destinazioni:`;

        const paesiList = `
🇮🇹 Italia
🇪🇸 Spagna
🇫🇷 Francia
🇦🇹 Austria
🇧🇪 Belgio
🇵🇹 Portogallo
🇩🇪 Germania
🇳🇱 Paesi Bassi
🇱🇺 Lussemburgo
`.trim();

        const paesiEmbed = new EmbedBuilder()
            .setColor('#3499FF')
            .setTitle('✈️ Paesi Disponibili per la Spedizione')
            .setDescription(embedDescription)
            .addFields(
                {
                    name: 'Destinazioni Servite:',
                    value: paesiList,
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Controlla sempre il canale destinazioni per aggiornamenti!',
                iconURL: client.user.displayAvatarURL()
            });

        await message.channel.send({ embeds: [paesiEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed paesi:', error));
    },
};