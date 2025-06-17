require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config.json');

// Variabili da .env o config.json
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || config.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID || config.GUILD_ID;

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN mancante.");
  process.exit(1);
}
if (!CLIENT_ID) {
  console.error("❌ CLIENT_ID mancante.");
  process.exit(1);
}
if (!GUILD_ID) {
  console.warn("⚠️ GUILD_ID mancante. Deploy globale (più lento).");
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.data && typeof command.data.toJSON === 'function') {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`[SKIP] ${file} non esporta correttamente un comando slash.`);
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🚀 Deploying ${commands.length} slash command(s)...`);

    let data;
    if (GUILD_ID) {
      data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} comandi deployati nella GUILD ${GUILD_ID}`);
    } else {
      data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ ${data.length} comandi deployati globalmente`);
    }
  } catch (error) {
    console.error('❌ Errore nel deploy:', error);
  }
})();
