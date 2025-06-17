const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invita')
    .setDescription('Genera e mostra il tuo codice referral personale'),

  async execute({ interaction, client, dataStore, config }) {
    const { ERROR_MESSAGE_TIMEOUT_MS = 10000 } = config;

    const userId = interaction.user.id;
    const username = interaction.user.username;

    const referrals = await dataStore.getReferrals();
    referrals.codes = referrals.codes || {};
    referrals.reverse = referrals.reverse || {};

    let referralCode = referrals.codes[userId];
    if (!referralCode) {
      referralCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      referrals.codes[userId] = referralCode;
      referrals.reverse[referralCode] = userId;
      await dataStore.setReferrals(referrals);
    }

    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle("🤝 Il tuo Codice Referral")
      .setDescription(
        `Ciao **${username}**!\n\n` +
        `🔗 Il tuo codice referral personale è: \`${referralCode}\`\n\n` +
        `Condividilo con i tuoi amici! Quando un amico si iscrive e ricarica almeno **15€**, tu riceverai un bonus speciale.\n\n` +
        `➡️ Per usare un codice: \`/referral\`\n` +
        `🏆 Per vedere la classifica referral: \`/leaderboard_referral\``
      );

    await interaction.reply({
      embeds: [embed],
      flags: 64 // Ephemeral (solo per l’utente)
    });
  },
};
