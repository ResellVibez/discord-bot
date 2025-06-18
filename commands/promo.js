const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promo')
    .setDescription('Mostra l\'annuncio completo sul sistema crediti e referral')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Solo chi può gestire il server può usare questo comando
  async execute({ interaction }) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Sistema di Crediti & Promozioni Attive!')
        .setDescription(
          `Ciao a tutti! Siamo entusiasti di annunciarvi l'introduzione del nostro **nuovo sistema di crediti** sul server! Questo sistema vi offrirà valore aggiunto e nuove interazioni.\n\n` +

          `💳 **Ricariche Speciali con Bonus Crediti:**\n` +
          `A partire da una ricarica minima di **15€**, riceverete un **bonus automatico** in crediti! Più ricaricate, maggiore sarà il vostro bonus:\n\n` +
          `* **15€** → +10% bonus = **16.50€** di crediti\n` +
          `* **30€** → +15% bonus = **34.50€** di crediti\n` +
          `* **50€** → +20% bonus = **60.00€** di crediti\n` +
          `* **100€** → +30% bonus = **130.00€** di crediti\n` +
          `* **200€** → +50% bonus = **300.00€** di crediti\n\n` +

          `🤝 **Programma Referral: Invita e Guadagna!**\n` +
          `Invita i tuoi amici e ottieni fantastiche ricompense:\n` +
          `Quando un amico si unisce con il tuo codice e ricarica almeno **15€**, tu ricevi **2€** di bonus!\n` +
          `In più, chi si iscrive tramite referral ottiene **1 spedizione gratuita in Italia (valore €1.50)**!\n\n` +
          // Qui aggiorniamo i comandi da "!" a "/"
          `🔹 Genera il tuo codice: \`/invita\`\n` +
          `🔹 Riscatta la spedizione: \`/riscatta_spedizione\`\n` +
          `🔹 Consulta la classifica: \`/leaderboard_referral\`\n\n` +

          `⚙️ **Comandi Utili:**\n` +
          // Qui aggiorniamo il comando da "!" a "/"
          `• \`/saldo\` → Visualizza il tuo saldo crediti\n` +
         

          `🗣️ **Hai proposte o idee?**\n` +
          `La tua opinione è fondamentale! Apri un ticket sul server e condividi i tuoi suggerimenti per migliorare il sistema!\n\n` +

          `📩 Per ricariche o qualsiasi altra informazione, contatta il nostro staff: <@&1358074842834014269>.\n\n` +
          `Grazie per il vostro supporto e buon divertimento con i vostri crediti!`
        )
        .setColor('#00b894'); // Un bel colore verde acqua

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Errore nel comando /promo:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Si è verificato un errore durante l’invio della promozione.',
          ephemeral: true, // Messaggio visibile solo a chi ha eseguito il comando
        });
      }
    }
  },
};