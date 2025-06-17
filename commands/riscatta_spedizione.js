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
    const { ERROR_MESSAGE_TIMEOUT_MS } = config;
    const userId = interaction.user.id;

    const freeShippings = await dataStore.getFreeShippings();
    const currentFreeShippings = freeShippings[userId] || 0;

    if (currentFreeShippings <= 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(`❌ Non hai spedizioni gratuite disponibili. Saldo attuale: \`${currentFreeShippings}\`.`);
      return interaction.reply({ embeds: [errorEmbed], flags: 64 });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor("#FFA500")
      .setTitle("❓ Conferma Riscatto Spedizione Gratuita")
      .setDescription(
        `Hai **\`${currentFreeShippings}\`** spedizioni gratuite disponibili.

` +
        `Sei sicuro di voler riscattare una spedizione gratuita?
` +
        `Questo ridurrà il tuo saldo a **\`${currentFreeShippings - 1}\`**.`
      )
      .setFooter({ text: 'Questa richiesta scadrà in 30 secondi.' });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_${userId}`)
          .setLabel('✅ Riscatta')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cancel_${userId}`)
          .setLabel('Annulla')
          .setStyle(ButtonStyle.Danger),
      );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [row]
    });

    const reply = await interaction.fetchReply();  // ✅ fix

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000
    });

    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ content: '❌ Non puoi usare questo bottone.', ephemeral: true });
      }

      await i.deferUpdate();

      if (i.customId === `confirm_${userId}`) {
        const updatedData = await dataStore.getFreeShippings();
        const actualFreeShippings = updatedData[userId] || 0;

        if (actualFreeShippings <= 0) {
          return i.editReply({
            embeds: [new EmbedBuilder()
              .setColor('Red')
              .setDescription('❌ Non hai più spedizioni gratuite disponibili.')],
            components: []
          });
        }

        updatedData[userId] -= 1;
        await dataStore.setFreeShippings(updatedData);

        const credits = await dataStore.getUserCredits();
        credits[userId] = (credits[userId] || 0) + 1.5;
        await dataStore.setUserCredits(credits);
        client.userCredits = credits;

        const transactions = await dataStore.getTransactions();
        const transactionId = `${Date.now()}-redeem-${userId}`;
        transactions[transactionId] = {
          timestamp: new Date().toISOString(),
          type: "redeem_free_shipping",
          userId: userId,
          username: i.user.tag,
          freeShippingsBefore: actualFreeShippings,
          freeShippingsAfter: updatedData[userId],
          amountRedeemed: 1,
          creditEarned: 1.5
        };
        await dataStore.setTransactions(transactions);

        const successEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("📦 Spedizione Riscattata")
          .setDescription(
            `Hai riscattato una spedizione gratuita!
` +
            `📦 Spedizioni rimanenti: \`${updatedData[userId]}\`
` +
            `💰 Saldo aggiornato: **${credits[userId].toFixed(2)}€**`
          );

        await i.editReply({ embeds: [successEmbed], components: [] });
      }

      if (i.customId === `cancel_${userId}`) {
        await i.editReply({
          content: '❌ Riscatto annullato.',
          embeds: [],
          components: []
        });
      }

      collector.stop();
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        await interaction.editReply({
          content: '⌛ Tempo scaduto. Riscatto annullato.',
          embeds: [],
          components: []
        }).catch(() => {});
      }
    });
  }
};