const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('paesi')
    .setDescription('Mostra i paesi disponibili per la spedizione')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // visibile solo ad admin/mod
  async execute({ interaction }) {
    try {
      const embed = new EmbedBuilder()
        .setTitle('✈️ Paesi Disponibili per la Spedizione')
        .setDescription(
          `🌍 Il nostro servizio di spedizione porta i tuoi pacchi in giro per il mondo! Attualmente siamo disponibili per le seguenti destinazioni:\n\n` +
          `**Destinazioni Servite:**\n` +
          `🇮🇹 Italia\n` +
          `🇪🇸 Spagna\n` +
          `🇫🇷 Francia\n` +
          `🇦🇹 Austria\n` +
          `🇧🇪 Belgio\n` +
          `🇵🇹 Portogallo\n` +
          `🇩🇪 Germania\n` +
          `🇳🇱 Paesi Bassi\n` +
          `🇱🇺 Lussemburgo\n\n` +
          `ℹ️ Controlla sempre il canale **#destinazioni** per aggiornamenti!`
        )
        .setColor('#3498db');

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Errore nel comando /paesi:', error);
      if (!interaction.replied) {
        await interaction.reply({
          content: '❌ Errore durante l’esecuzione del comando.',
          ephemeral: true
        });
      }
    }
  },
};
