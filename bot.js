require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const DataStore = require('./dataStore');

// Verifica variabili d’ambiente
const requiredEnvs = ['DISCORD_TOKEN'];
for (const v of requiredEnvs) {
  if (!process.env[v]) {
    console.error(`Errore: variabile d'ambiente ${v} non impostata.`);
    process.exit(1);
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Collezioni comandi e memoria
client.commands = new Collection();
client.dataStore = new DataStore();

// Carica i comandi
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const command = require(path.join(commandsPath, file));
    if (command.data && typeof command.execute === 'function') {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARN] Il file ${file} non esporta correttamente data/execute.`);
    }
  });

async function guardAndDelete(message, staffOnly = false) {
  try { await message.delete(); } catch {}
  if (staffOnly) {
    const hasRole = config.ADMIN_ROLES_IDS.some(r => message.member.roles.cache.has(r));
    if (!hasRole) throw new Error('NO_PERMISSION');
  }
}

client.once('ready', async () => {
  console.log(`${client.user.tag} è online!`);

  // ✅ Carica referral e separa i dati in modo corretto
  const allReferralData = await client.dataStore.getReferrals();
  client.referralCodes = allReferralData.codes || {};
  client.referredUsers = allReferralData.referredUsers || {};

  // Altri dati
  client.userCredits = await client.dataStore.getUserCredits();
  client.userFreeShippings = await client.dataStore.getFreeShippings();
  client.transactions = await client.dataStore.getTransactions();
});



// Comandi a prefisso (!)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;
  const args = message.content.slice(config.PREFIX.length).trim().split(/\s+/);
  const cmdName = args.shift().toLowerCase();
  const command = client.commands.get(cmdName);
  if (!command) return;

  try {
    await guardAndDelete(message, command.data.staffOnly);
    await command.execute({
  message,
  args,
  client,
  config,
  dataStore: client.dataStore, // 👉 AGGIUNGI QUESTO
  saveCredits: client.dataStore.setUserCredits?.bind(client.dataStore),
  saveReferralData: client.dataStore.setReferrals?.bind(client.dataStore),
  saveFreeShippings: client.dataStore.setFreeShippings?.bind(client.dataStore),
  saveTransactions: client.dataStore.setTransactions?.bind(client.dataStore),
});
  } catch (err) {
    if (err.message === 'NO_PERMISSION') {
      return message.channel
        .send('❌ Non hai i permessi necessari.')
        .then(m => setTimeout(() => m.delete().catch(), config.ERROR_MESSAGE_TIMEOUT_MS));
    }
    console.error(err);
  }
});

// Comandi Slash (/)
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute({
  interaction,
  client,
  config,
  dataStore: client.dataStore, // 👉 QUESTA È LA RIGA MANCANTE
  saveCredits: client.dataStore.setUserCredits?.bind(client.dataStore),
  saveReferralData: client.dataStore.setReferrals?.bind(client.dataStore),
  saveFreeShippings: client.dataStore.setFreeShippings?.bind(client.dataStore),
  saveTransactions: client.dataStore.setTransactions?.bind(client.dataStore),
});
  } catch (err) {
    console.error(err);
    const reply = { content: '⚠️ Si è verificato un errore interno.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
