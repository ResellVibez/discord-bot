const fs = require('fs');
const path = require('path');

async function testCommands() {
  console.log('🧪 Avvio test dei comandi...\n');

  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = require(filePath);

      if (!command.data) {
        console.log(`⚠️  ${file} ➜  manca 'data'`);
        continue;
      }

      if (typeof command.execute !== 'function') {
        console.log(`❌ ${command.data.name || file} ➜  manca la funzione 'execute'`);
        continue;
      }

      if (!command.data.name || !command.data.description) {
        console.log(`⚠️  ${file} ➜  'name' o 'description' mancante`);
        continue;
      }

      console.log(`✅ ${command.data.name} ➜ OK`);
    } catch (err) {
      console.log(`❌ Errore nel file ${file}:\n`, err.message);
    }
  }

  console.log('\n✅ Test completato.\n');
}

testCommands();
