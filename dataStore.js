const fs = require('fs').promises;
const path = require('path');

class DataStore {
  constructor(dataDir = __dirname) {
    this.dataDir = dataDir;
    this.files = {
      referrals: 'referrals.json',
      freeShippings: 'freeShippings.json',
      userCredits: 'userCredits.json',
      transactions: 'transactions.json',
    };
  }

  // Metodo generico di lettura
  async _readJSON(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return data.trim() ? JSON.parse(data) : {};
    } catch (error) {
      console.error(`Errore nella lettura di ${filename}:`, error);
      return {};
    }
  }

  // Metodo generico di scrittura
  async _writeJSON(filename, data) {
    if (typeof data !== 'object' || data === null) {
      console.error(`❌ Dato non valido per la scrittura in ${filename}:`, data);
      return;
    }

    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Errore nella scrittura di ${filename}:`, error);
    }
  }

  // 📦 REFERRALS
  async getReferrals() {
    return this._readJSON(this.files.referrals);
  }

  async setReferrals(data) {
    return this._writeJSON(this.files.referrals, data);
  }

  // 🚚 SPEDIZIONI GRATUITE
  async getFreeShippings() {
    return this._readJSON(this.files.freeShippings);
  }

  async setFreeShippings(data) {
    return this._writeJSON(this.files.freeShippings, data);
  }

  // 💰 CREDITI UTENTE
  async getUserCredits() {
    return this._readJSON(this.files.userCredits);
  }

  async setUserCredits(data) {
    return this._writeJSON(this.files.userCredits, data);
  }

  // 💳 TRANSAZIONI
  async getTransactions() {
    return this._readJSON(this.files.transactions);
  }

  async setTransactions(data) {
    return this._writeJSON(this.files.transactions, data);
  }
}

module.exports = DataStore;
