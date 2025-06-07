const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const fs = require('node:fs/promises'); // Per la persistenza dei dati
const path = require('node:path');      // Per gestire i percorsi dei file

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

// COLLEZIONE DEI COMANDI
client.commands = new Collection();
// DATABASE DEI CREDITI UTENTE (in memoria, verrà caricato/salvato da file)
client.userCredits = {};
const DATA_FILE = 'userCredits.json';

// --- Funzioni per la persistenza dei dati ---
async function loadCredits() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        Object.assign(client.userCredits, JSON.parse(data));
        console.log('✅ Crediti caricati dal file.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Nessun file di crediti trovato, inizio con un database vuoto.');
        } else {
            console.error('❌ Errore durante il caricamento dei crediti:', error);
        }
    }
}

async function saveCredits() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(client.userCredits, null, 2), 'utf8');
        // console.log('Crediti salvati su file.'); // Scommenta per debug
    } catch (error) {
        console.error('❌ Errore durante il salvataggio dei crediti:', error);
    }
}

// --- Caricamento dei comandi ---
async function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = (await fs.readdir(commandsPath)).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.warn(`[WARNING] Il comando in ${filePath} manca di una proprietà "data" o "execute" richiesta.`);
            }
        } catch (error) {
            console.error(`❌ Errore durante il caricamento del comando da ${filePath}:\n`, error);
        }
    }
    console.log(`✅ Caricati ${client.commands.size} comandi.`);
}

// --- Eventi del Bot ---
client.on("ready", async () => {
    await loadCredits(); // Carica i crediti all'avvio
    await loadCommands(); // Carica i comandi
    console.log(`✅ Bot online come ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        // La logica di verifica permessi e l'eliminazione del messaggio
        // (se desiderata per quel comando) è ora gestita ALL'INTERNO del file del comando specifico.
        await command.execute(message, args, client, saveCredits, config);
    } catch (error) {
        console.error(`❌ Errore nell'esecuzione del comando ${commandName}:`, error);
        const errorEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription(`❌ Si è verificato un errore durante l'esecuzione di questo comando.`);
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
});

// Login del bot con il token
client.login(process.env.DISCORD_BOT_TOKEN);
