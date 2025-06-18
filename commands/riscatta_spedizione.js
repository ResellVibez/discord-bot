const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('riscatta_spedizione')
        .setDescription('Riscatta una spedizione gratuita disponibile.')
        .setDMPermission(false),

    async execute({ interaction, dataStore, config, client }) {
        // ERROR_MESSAGE_TIMEOUT_MS non è più necessario qui
        // const { ERROR_MESSAGE_TIMEOUT_MS } = config;
        const { CURRENCY, REFERRAL_FREE_SHIPPING_CREDIT_VALUE } = config; // Assicurati di avere REFERRAL_FREE_SHIPPING_CREDIT_VALUE nel config

        const userId = interaction.user.id;
        const username = interaction.user.tag; // Per i log e le transazioni

        try {
            // 1. Recupera il numero attuale di spedizioni gratuite dell'utente dal DB
            const currentFreeShippings = await dataStore.getUserFreeShippings(userId);

            if (currentFreeShippings <= 0) {
                const errorEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setDescription(`❌ Non hai spedizioni gratuite disponibili. Saldo attuale: \`${currentFreeShippings}\`.`);
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true }); // flags: 64 è deprecato
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle("❓ Conferma Riscatto Spedizione Gratuita")
                .setDescription(
                    `Hai **\`${currentFreeShippings}\`** spedizion${currentFreeShippings === 1 ? 'e' : 'i'} gratuita${currentFreeShippings === 1 ? '' : 'e'} disponibile${currentFreeShippings === 1 ? '' : 'i'}.` +
                    `\n\nSei sicuro di voler riscattare una spedizione gratuita?` +
                    `\nQuesto ridurrà il tuo saldo a **\`${currentFreeShippings - 1}\`** e ti verranno accreditati **${REFERRAL_FREE_SHIPPING_CREDIT_VALUE.toFixed(2)}${CURRENCY}**.`
                )
                .setFooter({ text: 'Questa richiesta scadrà in 30 secondi.' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_redeem_${userId}`) // Cambiato customId per evitare possibili conflitti e specificare l'azione
                        .setLabel('✅ Riscatta')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`cancel_redeem_${userId}`) // Cambiato customId
                        .setLabel('Annulla')
                        .setStyle(ButtonStyle.Danger),
                );

            const reply = await interaction.reply({
                embeds: [confirmEmbed],
                components: [row],
                ephemeral: true // Solo l'utente deve vedere questo messaggio
            });

            // Usiamo createMessageComponentCollector sulla reply per evitare problemi con interazioni multiple
            const collector = reply.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 30000
            });

            collector.on('collect', async i => {
                // Assicurati che solo l'utente che ha invocato il comando possa cliccare
                if (i.user.id !== userId) {
                    return i.reply({ content: '❌ Non puoi usare questo bottone. Questa interazione è per un altro utente.', ephemeral: true });
                }

                await i.deferUpdate(); // Deferisce l'aggiornamento per evitare l'errore "interaction failed"

                if (i.customId === `confirm_redeem_${userId}`) {
                    // Rileggi il saldo spedizioni per evitare race conditions (se l'utente le usa velocemente altrove)
                    const actualFreeShippings = await dataStore.getUserFreeShippings(userId);

                    if (actualFreeShippings <= 0) {
                        collector.stop('no_shippings_left'); // Ferma il collector con un motivo specifico
                        return i.editReply({
                            embeds: [new EmbedBuilder()
                                .setColor('Red')
                                .setDescription('❌ Non hai più spedizioni gratuite disponibili.')],
                            components: []
                        });
                    }

                    // Decrementa le spedizioni gratuite
                    const successDecrement = await dataStore.removeUserFreeShippings(userId, 1);
                    if (!successDecrement) {
                        throw new Error("Errore nel decrementare le spedizioni gratuite.");
                    }
                    const updatedFreeShippingsCount = await dataStore.getUserFreeShippings(userId); // Ottieni il nuovo conteggio

                    // Aggiungi i crediti all'utente
                    const successAddCredits = await dataStore.addCredits(userId, REFERRAL_FREE_SHIPPING_CREDIT_VALUE);
                    if (!successAddCredits) {
                        throw new Error("Errore nell'aggiungere i crediti dalla spedizione gratuita.");
                    }
                    const newBalance = await dataStore.getUserCredits(userId); // Ottieni il nuovo saldo crediti

                    // Registra la transazione
                    await dataStore.addTransaction(
                        userId,
                        'riscatto_spedizione_gratuita',
                        REFERRAL_FREE_SHIPPING_CREDIT_VALUE, // L'ammontare di credito ottenuto
                        `Riscattata 1 spedizione gratuita. Crediti accreditati: ${REFERRAL_FREE_SHIPPING_CREDIT_VALUE.toFixed(2)}${CURRENCY}.`
                    );

                    const successEmbed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle("📦 Spedizione Riscattata!")
                        .setDescription(
                            `Hai riscattato una spedizione gratuita! 🎉` +
                            `\n\n📦 Spedizioni rimanenti: \`${updatedFreeShippingsCount}\`` +
                            `\n💰 Saldo aggiornato: **${newBalance.toFixed(2)}${CURRENCY}**`
                        );

                    await i.editReply({ embeds: [successEmbed], components: [] });
                    collector.stop('confirmed'); // Ferma il collector dopo la conferma
                } else if (i.customId === `cancel_redeem_${userId}`) {
                    await i.editReply({
                        content: '❌ Riscatto annullato.',
                        embeds: [],
                        components: []
                    });
                    collector.stop('cancelled'); // Ferma il collector
                }
            });

            collector.on('end', async (collected, reason) => {
                // Modifica il messaggio solo se non è già stato modificato (es. dall'utente che ha cliccato un bottone)
                if (reason === 'time' && collected.size === 0) { // Controlla se non ci sono state interazioni raccolte
                    try {
                        await reply.edit({
                            content: '⌛ Tempo scaduto. Riscatto annullato.',
                            embeds: [],
                            components: []
                        });
                    } catch (err) {
                        // Ignora errori se il messaggio è già stato cancellato o modificato
                        console.warn('Errore durante l\'aggiornamento del messaggio scaduto:', err);
                    }
                }
            });

        } catch (error) {
            console.error('Errore nel comando /riscatta_spedizione:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Si è verificato un errore durante il riscatto della spedizione. Riprova più tardi.");
            // Rispondi all'interazione originale se non è già stata gestita
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
        }
    },
};