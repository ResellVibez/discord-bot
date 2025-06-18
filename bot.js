require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
const DataStore = require('./dataStore');
const { Pool } = require('pg');

// --- Configurazione Database PostgreSQL ---
// Railway imposta automaticamente process.env.DATABASE_URL.
// Per testing locale, assicurati di avere un file .env con DATABASE_URL="postgresql://..."
// Il 'dotenv'.config() all'inizio lo caricherà.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // La configurazione SSL è spesso necessaria per DB cloud.
    // 'rejectUnauthorized: false' è un workaround per certi certificati,
    // ma idealmente dovresti configurare ssl: true e fornire un certificato CA
    // se il tuo provider lo richiede/fornisce per una maggiore sicurezza.
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false // Per Railway in produzione, spesso necessario
    } : false // In sviluppo locale, non usare SSL a meno che il tuo DB locale non lo richieda
});

// Test della connessione al DB
pool.on('connect', () => {
    console.log('✅ Connesso al database PostgreSQL');
});
pool.on('error', (err) => {
    console.error('❌ Errore di connessione al database PostgreSQL:', err.message, err.stack);
    // È una buona idea terminare il processo qui se il DB è critico per il funzionamento del bot.
    process.exit(1);
});
// --- Fine Configurazione Database ---


// Verifica variabili d’ambiente essenziali
const requiredEnvs = ['DISCORD_TOKEN', 'DATABASE_URL']; // DATABASE_URL è sempre richiesto
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
        GatewayIntentBits.GuildMembers, // Consiglio di aggiungere questo per i comandi che fetchano i membri (es. /saldo per admin)
    ],
});

// Collezioni comandi
client.commands = new Collection();
client.dataStore = new DataStore(pool); // Passa il pool del database a DataStore

// Carica i comandi
const commandsPath = path.join(__dirname, 'commands');
fs.readdirSync(commandsPath)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
        const command = require(path.join(commandsPath, file));
        if (command.data && typeof command.execute === 'function') {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARN] Il file ${file} non esporta correttamente data/execute: ${file}`);
        }
    });

// La funzione guardAndDelete (non direttamente usata nei comandi slash che abbiamo modificato, ma va bene tenerla)
async function guardAndDelete(message, staffOnly = false) {
    try { await message.delete(); } catch {} // A volte delete può fallire, meglio catturare
    if (staffOnly) {
        // Questo controllo è più specifico per i comandi a prefisso.
        // Per i comandi slash, usa setDefaultMemberPermissions() nella loro definizione.
        const hasRole = config.ADMIN_ROLES_IDS.some(r => message.member.roles.cache.has(r));
        if (!hasRole) throw new Error('NO_PERMISSION');
    }
}

// Evento 'ready' del bot
client.once('ready', async () => {
    console.log(`${client.user.tag} è online!`);

    // --- Inizializzazione del DataStore con il database ---
    try {
        await client.dataStore.initDatabase(); // Chiamiamo un metodo per inizializzare il DB (creare tabelle se non esistono)
        console.log('✅ Inizializzazione database DataStore completata (tabelle verificate/create).');
    } catch (err) {
        console.error('❌ Errore critico durante inizializzazione database DataStore:', err);
        process.exit(1); // Termina il bot se non riesce a inizializzare il DB
    }

    // Le proprietà seguenti sono state rimosse e gestite da DataStore:
    // client.referralCodes = allReferralData.codes || {};
    // client.referredUsers = allReferralData.referredUsers || {};
    // client.userCredits = await client.dataStore.getUserCredits(); // Questa era una cache completa
    // client.userFreeShippings = await client.dataStore.getFreeShippings(); // Questa era una cache completa
    // client.transactions = await client.dataStore.getTransactions(); // Questa era una cache completa

    // NOTA: Ora i comandi dovranno chiamare direttamente client.dataStore.get/setXXX()
});


// Comandi a prefisso (!)
// Attenzione: se usi ancora comandi a prefisso che modificano i dati,
// assicurati che anche loro usino client.dataStore
client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(config.PREFIX)) return;
    // Non abbiamo rivisto comandi a prefisso specifici, quindi assumiamo che
    // quelli che usano siano semplici o non scrivano sul DB
    const args = message.content.slice(config.PREFIX.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();
    const command = client.commands.get(cmdName);
    if (!command) return;

    try {
        // Se il comando a prefisso ha `staffOnly` e gestisci i ruoli così
        // assicurati che `message.member` sia disponibile (necessita GuildMembers intent)
        await guardAndDelete(message, command.data.staffOnly);

        await command.execute({
            message,
            args,
            client,
            config,
            dataStore: client.dataStore, // Passiamo il dataStore
            // Non passiamo più saveCredits, saveReferrals, ecc.
        });
    } catch (err) {
        if (err.message === 'NO_PERMISSION') {
            return message.channel
                .send('❌ Non hai i permessi necessari.')
                .then(m => setTimeout(() => m.delete().catch(() => {}), config.ERROR_MESSAGE_TIMEOUT_MS));
        }
        console.error(`Errore nel comando a prefisso ${cmdName}:`, err);
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
            dataStore: client.dataStore, // Passiamo il dataStore
        });
    } catch (err) {
        console.error(`Errore nel comando slash ${interaction.commandName}:`, err);
        const reply = { content: '⚠️ Si è verificato un errore interno durante l\'esecuzione del comando.', ephemeral: true };
        // Gestione per non fallire se l'interazione è già stata deferita/risposta
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(e => console.error("Errore nel followUp:", e));
        } else {
            await interaction.reply(reply).catch(e => console.error("Errore nella reply:", e));
        }
    }
});

client.login(process.env.DISCORD_TOKEN);