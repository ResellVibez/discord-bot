const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'paesi',
        description: 'Mostra i paesi disponibili per la spedizione con bandiere.',
    },
    async execute(message, args, client, saveCredits, config) {
        await message.delete().catch(() => {});

        // Ho migliorato la descrizione per renderla più accattivante
        const embedDescription = `🌍 Il nostro servizio di spedizione porta i tuoi pacchi in giro per il mondo! Attualmente siamo disponibili per le seguenti destinazioni:`;

        // Lista dei paesi con le emoji delle bandiere
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
            .setColor('#3499FF') // Un blu più vivace
            .setTitle('✈️ Paesi Disponibili per la Spedizione') // Aggiunto un'emoji al titolo
            .setDescription(embedDescription)
            .addFields(
                {
                    name: 'Destinazioni Servite:', // Titolo del campo più descrittivo
                    value: paesiList,
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Controlla sempre il canale destinazioni per aggiornamenti!',
                iconURL: client.user.displayAvatarURL() // Ho usato l'icona del bot come footer, per coerenza
            });

        await message.channel.send({ embeds: [paesiEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed paesi:', error));
    },
};