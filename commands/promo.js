const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promo')
    .setDescription('Annuncio completo sul sistema crediti e referral')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute({ interaction }) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Sistema di Crediti & Promozioni Attive!')
        .setDescription(
          `Ciao a tutti! Siamo entusiasti di annunciarvi che abbiamo finalmente **introdotto un sistema di crediti** sul nostro server! Questo nuovo sistema è pensato per darvi un valore aggiunto e nuove possibilità di interazione.\n\n` +

          `💳 **Ricariche Speciali con Bonus Crediti:**\n` +
          `A partire da una ricarica minima di **15€**, riceverai un **bonus automatico** in crediti! Più ricarichi, maggiore sarà il bonus:\n\n` +
          `* **15€** → +10% bonus = **16.50€** di crediti\n` +
          `* **30€** → +15% bonus = **34.50€** di crediti\n` +
          `* **50€** → +20% bonus = **60.00€** di crediti\n` +
          `* **100€** → +30% bonus = **130.00€** di crediti\n` +
          `* **200€** → +50% bonus = **300.00€** di crediti\n\n` +

          `🤝 **Programma Referral:**\n` +
          `Invita i tuoi amici e ricevi premi!\n` +
          `Quando un amico si unisce con il tuo codice e ricarica almeno **15€**, ricevi **2€** di bonus!\n` +
          `In più, chi si iscrive tramite referral ottiene **1 spedizione gratuita in Italia (valore €1.50)**.\n\n` +
          `🔹 Genera il tuo codice: \`!invita\`\n` +
          `🔹 Riscatta la spedizione: \`!riscatta_spedizione\`\n` +
          `🔹 Consulta la classifica: \`!leaderboard_referral\`\n\n` +

          `⚙️ **Comandi Utili:**\n` +
          `• \`!saldo\` → Visualizza il tuo saldo crediti\n\n` +

          `🗣️ **Hai proposte o idee?**\n` +
          `Apri un ticket sul server e raccontaci cosa ne pensi!\n\n` +

          `📩 Per ricariche o info, contatta lo staff <@&1358074842834014269>.\n\n` +
          `Grazie per il vostro supporto e buon divertimento con i vostri crediti!`
        )
        .setColor('#00b894');

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Errore nel comando /promo:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Errore durante l’invio della promozione.',
          ephemeral: true,
        });
      }
    }
  },
};
