const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('togli')
    .setDescription('Toglie un importo specifico dai crediti di un utente.')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('L\'utente a cui togliere i crediti.')
        .setRequired(true)
    )
    .addNumberOption(option =>
      option.setName('importo')
        .setDescription('L\'importo da togliere.')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, client, config, saveCredits }) {
    const { CURRENCY, ADMIN_ROLES_IDS = [] } = config;

    const member = interaction.member;
    const userRoles = member.roles.cache.map(role => role.id);
    const isAuthorized = ADMIN_ROLES_IDS.some(id => userRoles.includes(id));

    if (!isAuthorized) {
      return interaction.reply({
        content: "❌ Non hai i permessi per usare questo comando.",
        flags: MessageFlags.Ephemeral
      });
    }

    const targetUser = interaction.options.getUser('utente');
    const amount = interaction.options.getNumber('importo');

    const currentBalance = client.userCredits[targetUser.id] || 0;

    if (currentBalance < amount) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(
              `❌ **Credito insufficiente!**\nSaldo attuale: **${currentBalance.toFixed(2)}${CURRENCY}**`
            )
        ],
        flags: MessageFlags.Ephemeral
      });
    }

    client.userCredits[targetUser.id] = currentBalance - amount;
    await saveCredits(client.userCredits);

    const embed = new EmbedBuilder()
      .setColor("#FFA500")
      .setDescription(`📦 **Tolti ${amount.toFixed(2)}${CURRENCY}** da ${targetUser.toString()}`)
      .addFields({
        name: "Nuovo saldo",
        value: `${client.userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
        inline: true
      });

    return interaction.reply({ embeds: [embed] });
  }
};
