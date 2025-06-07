const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Carica la configurazione
const config = require('./config.json');
const { PREFIX, STAFF_ROLES, CURRENCY } = config;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.commands = new Collection();
client.userCredits = {}; // Qui verranno memorizzati i crediti degli utenti

const creditsFilePath = path.join(__dirname, 'userCredits.json');

// Funzione per caricare i crediti
const loadCredits = () => {
    if (fs.existsSync(creditsFilePath)) {
        const data = fs.readFileSync(creditsFilePath, 'utf8');
        try {
            client.userCredits = JSON.parse(data);
            console.log('✅ Crediti caricati dal file.');
        } catch (error) {
            console.error('❌ Errore durante il parsing dei crediti, inizializzo a vuoto:', error);
            client.userCredits = {};
        }
    } else {
        console.log('⚠️ File crediti.json non trovato, inizializzo i crediti a vuoto.');
        client.userCredits = {};
    }
};

// Funzione per salvare i crediti
const saveCredits = async () => {
    fs.writeFileSync(creditsFilePath, JSON.stringify(client.userCredits, null, 2), 'utf8');
    console.log('💾 Crediti salvati sul file.');
};

// Carica i comandi
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] Il comando a ${filePath} manca di una proprietà "data" o "execute" richiesta.`);
    }
}

client.once('ready', async () => {
    console.log(`✅ Bot online come ${client.user.tag}`);
    loadCredits(); // Carica i crediti all'avvio
});

client.on('messageCreate', async message => {
    if (message.author.bot) return; // Ignora i messaggi dei bot

    // Ignora i messaggi senza il prefisso
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        await command.execute(message, args, client, saveCredits, config);
    } catch (error) {
        console.error(`❌ Errore nell'esecuzione del comando ${commandName}:`, error);
        await message.reply('Si è verificato un errore durante l\'esecuzione di questo comando.');
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);