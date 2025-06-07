const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'spedizione',
        description: 'Mostra informazioni sulle etichette di spedizione.',
        staffOnly: true, // <--- AGGIUNTO/MODIFICATO: Solo per lo staff
    },
    async execute(message, args, client, saveCredits, config) {
        const { STAFF_ROLES } = config; // <--- AGGIUNTO: Destruttura STAFF_ROLES

        // --- Verifica Permessi Staff ---
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        const isStaff = member && member.roles.cache.some(role => STAFF_ROLES.includes(role.name));
        if (!isStaff) {
            await message.delete().catch(() => {}); // Elimina il comando se non è staff
            return; // Interrompe l'esecuzione del comando
        }
        // --- Fine Verifica Permessi Staff ---

        await message.delete().catch(() => {});

        const spedizioneEmbed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('📦 Etichette di Spedizione')
            .setDescription('Benvenuto nel nostro servizio di etichette di spedizione! Offriamo soluzioni semplici e a prezzo fisso per i tuoi pacchi fino a 2 kg, indipendentemente dal peso esatto (0.5 kg, 1 kg o 2 kg).')
            .addFields(
                {
                    name: '💰 Prezzi',
                    value: 'Etichetta Nazionale (Italia): **€1.50**\nEtichetta Internazionale: **€2.50**',
                    inline: false
                },
                {
                    name: '👀 Controlla prima di ordinare',
                    value: 'Prima di richiedere una spedizione, controlla il canale <#1347931851481808959> per assicurarti che la destinazione sia supportata.',
                    inline: false
                },
                {
                    name: '💡 Nota Importante',
                    value: 'Le etichette sono valide solo per le destinazioni elencate nel canale.',
                    inline: false
                },
                {
                    name: '❗ Importante',
                    value: 'ShipX si impegna a offrire un servizio sicuro e affidabile, ma non è responsabile per eventuali smarrimenti, danni o altri imprevisti legati ai pacchi.',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Per qualsiasi dubbio o domanda, apri un ticket o contatta lo staff.',
                iconURL: client.user.displayAvatarURL()
            });

        await message.channel.send({ embeds: [spedizioneEmbed] })
            .catch(error => console.error('❌ Errore nell\'invio dell\'embed spedizione:', error));
    },
};