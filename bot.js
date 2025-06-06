const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// CONFIGURAZIONE
const STAFF_ROLES = ["Admin", "Staff"]; // Ruoli autorizzati (modificabili)
const PREFIX = "!";
const CURRENCY = "€";

// DATABASE
const userCredits = {};

// TARIFFE E BONUS
const tieredAmounts = [15, 30, 50, 100, 200];
const bonusRates = {
  15: 1.1, // +10%
  30: 1.15, // +15%
  50: 1.2, // +20%
  100: 1.3, // +30%
  200: 1.5, // +50%
};

client.on("ready", () => {
  console.log(`✅ Bot online come ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // COMANDO SALDO (accessibile a tutti)
  if (command === "saldo") {
    const targetUser = message.mentions.users.first() || message.author;
    const balance = userCredits[targetUser.id] || 0;

    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setDescription(
        `💰 Saldo ${targetUser.toString()}: **${balance.toFixed(2)}${CURRENCY}**`,
      );

    return message.reply({ embeds: [embed] });
  }

  // VERIFICA PERMESSI STAFF PER GLI ALTRI COMANDI
  const member = await message.guild.members
    .fetch(message.author.id)
    .catch(() => null);
  if (!member) return;

  const isStaff = member.roles.cache.some((role) =>
    STAFF_ROLES.includes(role.name),
  );
  if (!isStaff) {
    await message.delete().catch(() => {});
    return;
  }

  // ELIMINA COMANDO DELLO STAFF
  await message.delete().catch(() => {});

  // !ricarica @user 50 (solo importi tier)
  if (command === "ricarica") {
    const targetUser = message.mentions.users.first();
    const amount = parseFloat(args[1]);

    if (!targetUser || !amount || !tieredAmounts.includes(amount)) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          `❌ **Formato errato!** Usa: \`${PREFIX}ricarica @utente 50\`\n**Importi validi:** ${tieredAmounts.join(", ")}`,
        );
      return message.channel
        .send({ embeds: [errorEmbed] })
        .then((msg) => setTimeout(() => msg.delete(), 10000));
    }

    const total = amount * bonusRates[amount];
    userCredits[targetUser.id] = (userCredits[targetUser.id] || 0) + total;

    const successEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription(
        `✅ ${targetUser.toString()} ha ricevuto **${total.toFixed(2)}${CURRENCY}** (${amount}${CURRENCY} + ${((bonusRates[amount] - 1) * 100).toFixed(0)}% bonus)`,
      )
      .addFields({
        name: "Nuovo saldo",
        value: `${userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
        inline: true,
      });

    return message.channel.send({ embeds: [successEmbed] });
  }

  // !aggiungi @user 25 (qualsiasi importo)
  if (command === "aggiungi") {
    const targetUser = message.mentions.users.first();
    const amount = parseFloat(args[1]);

    if (!targetUser || isNaN(amount) || amount <= 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          `❌ **Formato errato!** Usa: \`${PREFIX}aggiungi @utente 25\`\nImporto deve essere un numero positivo`,
        );
      return message.channel
        .send({ embeds: [errorEmbed] })
        .then((msg) => setTimeout(() => msg.delete(), 10000));
    }

    userCredits[targetUser.id] = (userCredits[targetUser.id] || 0) + amount;

    const successEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription(
        `⚡ ${targetUser.toString()} ha ricevuto **${amount.toFixed(2)}${CURRENCY}** (credito diretto)`,
      )
      .addFields({
        name: "Nuovo saldo",
        value: `${userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
        inline: true,
      });

    return message.channel.send({ embeds: [successEmbed] });
  }

  // !togli @user 10
  if (command === "togli") {
    const targetUser = message.mentions.users.first();
    const amount = parseFloat(args[1]);

    if (!targetUser || isNaN(amount) || amount <= 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          `❌ **Formato errato!** Usa: \`${PREFIX}togli @utente 10\`\nImporto deve essere un numero positivo`,
        );
      return message.channel
        .send({ embeds: [errorEmbed] })
        .then((msg) => setTimeout(() => msg.delete(), 10000));
    }

    if ((userCredits[targetUser.id] || 0) < amount) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(
          `❌ **Credito insufficiente!**\nSaldo attuale: **${(userCredits[targetUser.id] || 0).toFixed(2)}${CURRENCY}**`,
        );
      return message.channel
        .send({ embeds: [errorEmbed] })
        .then((msg) => setTimeout(() => msg.delete(), 10000));
    }

    userCredits[targetUser.id] -= amount;
    const successEmbed = new EmbedBuilder()
      .setColor("#FFA500")
      .setDescription(
        `📦 **Tolti ${amount.toFixed(2)}${CURRENCY}** da ${targetUser.toString()}`,
      )
      .addFields({
        name: "Nuovo saldo",
        value: `${userCredits[targetUser.id].toFixed(2)}${CURRENCY}`,
        inline: true,
      });

    return message.channel.send({ embeds: [successEmbed] });
  }
});

client.login(
  "MTM4MDQ3ODA2NzI4OTM1ODQ3Nw.GGeEtq.xwT0cViJ70p3ppsEIZEDO6EVqzMmCeA6wVCwyo",
);
