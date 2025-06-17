const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_referral')
    .setDescription('Mostra le informazioni referral di un utente (Staff).')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('Utente da controllare')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute({ interaction, config, dataStore }) {
    const {
      CURRENCY,
      MIN_RECHARGE_FOR_REFERRAL_BONUS
    } = config;

    const targetUser = interaction.options.getUser('utente');
    const targetUserId = targetUser.id;

    // ✅ Legge i dati referral aggiornati direttamente dal file
    const referrals = await dataStore.getReferrals();
    const referralCodes = referrals.codes || {};
    const referredUsers = referrals.referredUsers || {};

    const userCode = referralCodes[targetUserId];
    const referredInfo = referredUsers[targetUserId];

    let description = `**Informazioni Referral per ${targetUser.toString()}:**\n\n`;

    if (userCode) {
      description += `**Codice Invito Generato:** \`${userCode}\`\n`;
      const referredCount = Object.values(referredUsers).filter(
        info => info.referrerId === targetUserId
      ).length;
      description += `**Utenti Referenziati da te:** ${referredCount}\n`;
    } else {
      description += "Non ha generato un codice di invito.\n";
    }

    description += "\n";

    if (referredInfo) {
      description += `**Referenziato da:** <@${referredInfo.referrerId}>\n`;
      description += `**Bonus Referral Dato:** ${referredInfo.bonusGiven ? '✅ Sì' : `❌ No (serve ricarica ≥ ${MIN_RECHARGE_FOR_REFERRAL_BONUS.toFixed(2)}${CURRENCY})`}\n`;
    } else {
      description += "Non è stato referenziato da nessuno.\n";
    }

    const embed = new EmbedBuilder()
      .setColor("#0099FF")
      .setTitle("🔍 Dettagli Referral Utente")
      .setDescription(description)
      .setFooter({ text: `Richiesto da ${interaction.user.tag}` });

    await interaction.reply({
      embeds: [embed],
      flags: 64 // ✅ visibile solo allo staff, senza warning
    });
  }
};
