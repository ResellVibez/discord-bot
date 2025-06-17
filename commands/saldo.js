const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Mostra il tuo saldo crediti o quello di un altro utente (solo admin).')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('Utente di cui visualizzare il saldo (solo admin)')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute({ interaction, client, config }) {
    const { CURRENCY, ADMIN_ROLES_IDS = [] } = config;

    const invoker = interaction.user;
    const target = interaction.options.getUser('utente');
    const guild = interaction.guild;
    let userToShow = invoker;
    let isAdmin = false;

    try {
      const member = await guild.members.fetch(invoker.id);
      const userRoleIds = member.roles.cache.map(role => role.id);
      isAdmin = ADMIN_ROLES_IDS.some(id => userRoleIds.includes(id));
    } catch (err) {
      console.warn('⚠️ Errore durante il controllo dei ruoli:', err);
    }

    if (target && target.id !== invoker.id && !isAdmin) {
      return interaction.reply({
        content: '❌ Non hai i permessi per visualizzare il saldo di altri utenti.',
        flags: 64
      });
    }

    userToShow = target || invoker;
    const balance = client.userCredits[userToShow.id] || 0;

    const embed = new EmbedBuilder()
      .setColor('#00BFFF')
      .setTitle('💰 Saldo Crediti')
      .setDescription(`${userToShow} ha **${balance.toFixed(2)}${CURRENCY}** disponibili.`);

    await interaction.reply({
      embeds: [embed],
      flags: 64
    });
  }
};
