const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checkspedizioni')
    .setDescription('Mostra il numero di spedizioni gratuite disponibili per te o per un altro utente (solo admin).')
    .addUserOption(option =>
      option.setName('utente')
        .setDescription('Utente di cui vuoi vedere le spedizioni (solo per admin)')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute({ interaction, client, config, dataStore }) {
    const { ADMIN_ROLES_IDS = [] } = config;

    const invoker = interaction.user;
    const target = interaction.options.getUser('utente');
    const guild = interaction.guild;

    let userToCheck = invoker;
    let isAdmin = false;

    try {
      const member = await guild.members.fetch(invoker.id);
      const roleIds = member.roles.cache.map(r => r.id);
      isAdmin = ADMIN_ROLES_IDS.some(id => roleIds.includes(id));
    } catch (err) {
      console.warn('Errore nel controllo ruoli:', err);
    }

    if (target && !isAdmin) {
      return interaction.reply({
        content: '❌ Non hai i permessi per controllare le spedizioni di altri utenti.',
        flags: 64
      });
    }

    userToCheck = target || invoker;

    const freeShippingsData = await dataStore.getFreeShippings();
    const freeShippings = freeShippingsData[userToCheck.id] || 0;

    const embed = new EmbedBuilder()
      .setColor("#0099FF")
      .setTitle("📦 Spedizioni Gratuite")
      .setDescription(`${userToCheck} ha **\`${freeShippings}\`** spedizion${freeShippings === 1 ? 'e' : 'i'} gratuita${freeShippings === 1 ? '' : 'e'}.`)
      .setFooter({ text: `Richiesto da ${invoker.tag}` });

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
