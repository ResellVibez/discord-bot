const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_referral')
    .setDescription('Mostra la classifica degli utenti con più referral.')
    .setDMPermission(false),

  async execute({ interaction, client, config }) {
    const referralCounts = {};

    for (const userId in client.referredUsers) {
      const referredInfo = client.referredUsers[userId];
      if (referredInfo?.referrerId) {
        const referrerId = referredInfo.referrerId;
        referralCounts[referrerId] = (referralCounts[referrerId] || 0) + 1;
      }
    }

    const sortedReferrers = Object.entries(referralCounts)
      .sort(([, a], [, b]) => b - a);

    if (sortedReferrers.length === 0) {
      const embed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setDescription("Non ci sono ancora referral registrati. Invita i tuoi amici!");
      return interaction.reply({ embeds: [embed], flags: 64 });
    }

    let description = "🏆 **Classifica Referral (Top 10)** 🏆\n\n";
    let rank = 1;

    for (const [referrerId, count] of sortedReferrers.slice(0, 10)) {
      const user = await client.users.fetch(referrerId).catch(() => null);
      const username = user?.username ?? `Utente Sconosciuto (${referrerId})`;
      description += `**${rank}.** ${username} - **${count}** referral\n`;
      rank++;
    }

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle("Classifica Referrals")
      .setDescription(description)
      .setFooter({ text: 'Invita più amici per salire in classifica!' });

    return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
