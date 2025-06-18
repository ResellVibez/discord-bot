require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const DataStore = require('./dataStore');
const { Pool } = require('pg'); // <-- AGGIUNTO: Importa Pool per PostgreSQL

// --- Configurazione Database PostgreSQL ---
// Railway imposta automaticamente process.env.DATABASE_URL.
// Per testing locale, assicurati di avere un file .env con DATABASE_URL="postgresql://..."
// Il 'dotenv'.config() all'inizio lo caricherà.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Spesso necessario per connessioni a DB cloud come Railway
    }
});

// Test della connessione al DB
pool.on('connect', () => {
    console.log('✅ Connesso al database PostgreSQL');
});
pool.on('error', (err) => {
    console.error('❌ Errore di connessione al database PostgreSQL:', err.message, err.stack);
    // Potresti voler terminare il processo del bot qui se il DB è critico
    // process.exit(1);
});
// --- Fine Configurazione Database ---


// Verifica variabili d’ambiente (assicurati che DISCORD_TOKEN sia sempre presente)
const requiredEnvs = ['DISCORD_TOKEN'];
// AGGIUNGI DATABASE_URL alle variabili richieste
if (!process.env.DATABASE_URL) {
    requiredEnvs.push('DATABASE_URL');
}

for (const v of requiredEnvs) {
    if (!process.env[v]) {
        console.error(`Errore: variabile d'ambiente ${v} non impostata.`);
        console.error('Se stai testando in locale, crea un file .env nella radice del progetto con le variabili.');
        process.exit(1);
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // AGGIUNGI altri intent se necessari, es. per i membri o i ruoli
        // GatewayIntentBits.GuildMembers,
    ],
});

// Collezioni comandi e memoria
client.commands = new Collection();
client.dataStore = new DataStore(pool); // <-- MODIFICATO: Passa il pool del database a DataStore

// Carica i comandi (il resto è come prima)
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

// La funzione guardAndDelete (come prima)
async function guardAndDelete(message, staffOnly = false) {
    try { await message.delete(); } catch {}
    if (staffOnly) {
        const hasRole = config.ADMIN_ROLES_IDS.some(r => message.member.roles.cache.has(r));
        if (!hasRole) throw new Error('NO_PERMISSION');
    }
}

// Evento 'ready' del bot
client.once('ready', async () => {
    console.log(`${client.user.tag} è online!`);

    // --- Inizializzazione del DataStore con il database ---
    try {
        await client.dataStore.initDatabase(); // <-- MODIFICATO: Chiamiamo un metodo per inizializzare il DB
        console.log('✅ Inizializzazione database DataStore completata.');
    } catch (err) {
        console.error('❌ Errore critico durante inizializzazione database DataStore:', err);
        process.exit(1); // Termina il bot se non riesce a inizializzare il DB
    }

    // Le proprietà seguenti non sono più necessarie se DataStore gestisce tutto
    // client.referralCodes = allReferralData.codes || {};
    // client.referredUsers = allReferralData.referredUsers || {};
    // client.userCredits = await client.dataStore.getUserCredits();
    // client.userFreeShippings = await client.dataStore.getFreeShippings();
    // client.transactions = await client.dataStore.getTransactions();

    // NOTA: Ora i comandi dovranno chiamare direttamente client.dataStore.get/setXXX()
});


// Comandi a prefisso (!) (come prima, ma con dataStore.get/set indiretti)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;
    const args = message.content.slice(config.PREFIX.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    const command = client.commands.get(cmdName);
    if (!command) return;

    try {
        await guardAndDelete(message, command.data.staffOnly);
        // Passiamo solo dataStore, i metodi saveXXX non servono più se dataStore li gestisce
        await command.execute({
            message,
            args,
            client,
            config,
            dataStore: client.dataStore,
        });
    } catch (err) {
        if (err.message === 'NO_PERMISSION') {
            return message.channel
                .send('❌ Non hai i permessi necessari.')
                .then(m => setTimeout(() => m.delete().catch(() => {}), config.ERROR_MESSAGE_TIMEOUT_MS));
        }
        console.error(err);
    }
});

// Comandi Slash (/) (come prima, ma con dataStore.get/set indiretti)
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // Passiamo solo dataStore
        await command.execute({
            interaction,
            client,
            config,
            dataStore: client.dataStore,
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