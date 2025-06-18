// dataStore.js

class DataStore {
    // Il costruttore ora riceve il pool di connessioni del database
    constructor(dbPool) {
        if (!dbPool) {
            throw new Error('DataStore richiede un pool di connessioni al database PostgreSQL.');
        }
        this.db = dbPool; // Salva l'istanza del pool di connessioni al database
    }

    // --- Metodo di Inizializzazione del Database (Creazione Tabelle) ---
    async initDatabase() {
        console.log('Inizializzazione tabelle database...');
        try {
            // Tabella per i crediti degli utenti
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS users_credits (
                    user_id VARCHAR(255) PRIMARY KEY,
                    balance NUMERIC(10, 2) DEFAULT 0.00
                );
            `);
            console.log('✅ Tabella users_credits verificata/creata.');

            // Tabella per i codici referral (basata su 'referrals.json')
            // Avrà bisogno di due tabelle: una per i codici e una per gli utenti referenziati
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS referral_codes (
                    code VARCHAR(255) PRIMARY KEY,
                    owner_id VARCHAR(255) NOT NULL,
                    uses INT DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Tabella referral_codes verificata/creata.');

            await this.db.query(`
                CREATE TABLE IF NOT EXISTS referred_users (
                    user_id VARCHAR(255) PRIMARY KEY,
                    referred_by_code VARCHAR(255) NOT NULL,
                    claimed_free_shipping BOOLEAN DEFAULT FALSE,
                    referred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_referral_code
                        FOREIGN KEY(referred_by_code)
                        REFERENCES referral_codes(code)
                        ON DELETE SET NULL
                );
            `);
            console.log('✅ Tabella referred_users verificata/creata.');

            // Tabella per le spedizioni gratuite (basata su 'freeShippings.json')
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS user_free_shippings (
                    user_id VARCHAR(255) PRIMARY KEY,
                    count INT DEFAULT 0
                );
            `);
            console.log('✅ Tabella user_free_shippings verificata/creata.');

            // Tabella per le transazioni (basata su 'transactions.json')
            await this.db.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL, -- es. 'ricarica', 'spesa', 'referral_bonus'
                    amount NUMERIC(10, 2) NOT NULL,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    description TEXT
                );
            `);
            console.log('✅ Tabella transactions verificata/creata.');


        } catch (err) {
            console.error('❌ Errore critico durante l\'inizializzazione delle tabelle del database:', err);
            throw err; // Rilancia l'errore per bloccare il bot se non si riesce a inizializzare il DB
        }
    }

    // --- 💰 CREDITI UTENTE ---
    //getUserCredits: Legge il saldo di un singolo utente
    async getUserCredits(userId) {
        try {
            const res = await this.db.query('SELECT balance FROM users_credits WHERE user_id = $1', [userId]);
            return parseFloat(res.rows[0]?.balance || 0); // Restituisce il saldo o 0 se non trovato
        } catch (error) {
            console.error(`Errore nel recupero crediti per ${userId}:`, error);
            return 0;
        }
    }

    // setUserCredits: Imposta (o aggiorna) il saldo di un singolo utente
    async setUserCredits(userId, newBalance) {
        try {
            await this.db.query(
                'INSERT INTO users_credits (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET balance = $2',
                [userId, newBalance]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'impostare crediti per ${userId}:`, error);
            return false;
        }
    }

    // addCredits: Aggiunge crediti al saldo esistente di un utente
    async addCredits(userId, amount) {
        try {
            await this.db.query(
                'INSERT INTO users_credits (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET balance = users_credits.balance + $3',
                [userId, amount, amount]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'aggiungere crediti per ${userId}:`, error);
            return false;
        }
    }

    // removeCredits: Rimuove crediti dal saldo esistente di un utente
    async removeCredits(userId, amount) {
        try {
            await this.db.query(
                'INSERT INTO users_credits (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET balance = users_credits.balance - $3',
                [userId, amount, amount]
            );
            return true;
        } catch (error) {
            console.error(`Errore nel rimuovere crediti per ${userId}:`, error);
            return false;
        }
    }


    // --- 📦 REFERRALS ---
    // getReferralCodes: Ottiene tutti i codici referral e i loro proprietari
    async getReferralCodes() {
        try {
            const res = await this.db.query('SELECT code, owner_id, uses FROM referral_codes');
            // Formatta il risultato per essere simile a quello del JSON se necessario
            const codes = {};
            res.rows.forEach(row => {
                codes[row.code] = { ownerId: row.owner_id, uses: row.uses };
            });
            return codes;
        } catch (error) {
            console.error('Errore nel recupero codici referral:', error);
            return {};
        }
    }

    // createReferralCode: Crea un nuovo codice referral
    async createReferralCode(code, ownerId) {
        try {
            await this.db.query(
                'INSERT INTO referral_codes (code, owner_id) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
                [code, ownerId]
            );
            return true;
        } catch (error) {
            console.error(`Errore nella creazione codice referral ${code} per ${ownerId}:`, error);
            return false;
        }
    }

    // incrementReferralUses: Incrementa l'uso di un codice referral
    async incrementReferralUses(code) {
        try {
            await this.db.query(
                'UPDATE referral_codes SET uses = uses + 1 WHERE code = $1',
                [code]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'incremento usi referral per ${code}:`, error);
            return false;
        }
    }

    // getReferredUsers: Ottiene tutti gli utenti referenziati
    async getReferredUsers() {
        try {
            const res = await this.db.query('SELECT user_id, referred_by_code, claimed_free_shipping FROM referred_users');
            const referred = {};
            res.rows.forEach(row => {
                referred[row.user_id] = { referredBy: row.referred_by_code, claimedShipping: row.claimed_free_shipping };
            });
            return referred;
        } catch (error) {
            console.error('Errore nel recupero utenti referenziati:', error);
            return {};
        }
    }

    // addReferredUser: Aggiunge un utente referenziato
    async addReferredUser(userId, referredByCode) {
        try {
            await this.db.query(
                'INSERT INTO referred_users (user_id, referred_by_code) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
                [userId, referredByCode]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'aggiungere utente referenziato ${userId}:`, error);
            return false;
        }
    }

    // setClaimedFreeShipping: Marca la spedizione gratuita come riscattata
    async setClaimedFreeShipping(userId, claimed) {
        try {
            await this.db.query(
                'UPDATE referred_users SET claimed_free_shipping = $1 WHERE user_id = $2',
                [claimed, userId]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'aggiornare spedizione gratuita per ${userId}:`, error);
            return false;
        }
    }


    // --- 🚚 SPEDIZIONI GRATUITE ---
    // getUserFreeShippings: Ottiene il numero di spedizioni gratuite di un utente
    async getUserFreeShippings(userId) {
        try {
            const res = await this.db.query('SELECT count FROM user_free_shippings WHERE user_id = $1', [userId]);
            return res.rows[0]?.count || 0;
        } catch (error) {
            console.error(`Errore nel recupero spedizioni gratuite per ${userId}:`, error);
            return 0;
        }
    }

    // addUserFreeShippings: Aggiunge spedizioni gratuite a un utente
    async addUserFreeShippings(userId, amount) {
        try {
            await this.db.query(
                'INSERT INTO user_free_shippings (user_id, count) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET count = user_free_shippings.count + $3',
                [userId, amount, amount]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'aggiungere spedizioni gratuite per ${userId}:`, error);
            return false;
        }
    }

    // removeUserFreeShippings: Rimuove spedizioni gratuite da un utente
    async removeUserFreeShippings(userId, amount) {
        try {
            await this.db.query(
                'INSERT INTO user_free_shippings (user_id, count) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET count = GREATEST(0, user_free_shippings.count - $3)',
                [userId, 0, amount] // 0 per insert iniziale, ma l'importante è il GREATEST
            );
            return true;
        } catch (error) {
            console.error(`Errore nel rimuovere spedizioni gratuite per ${userId}:`, error);
            return false;
        }
    }


    // --- 💳 TRANSAZIONI ---
    // addTransaction: Aggiunge una nuova transazione
    async addTransaction(userId, type, amount, description = null) {
        try {
            await this.db.query(
                'INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
                [userId, type, amount, description]
            );
            return true;
        } catch (error) {
            console.error(`Errore nell'aggiungere transazione per ${userId} (${type} ${amount}):`, error);
            return false;
        }
    }

    // getTransactionsByUserId: Recupera le transazioni per un utente specifico
    async getTransactionsByUserId(userId, limit = 10) {
        try {
            const res = await this.db.query(
                'SELECT id, type, amount, timestamp, description FROM transactions WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
                [userId, limit]
            );
            return res.rows;
        } catch (error) {
            console.error(`Errore nel recupero transazioni per ${userId}:`, error);
            return [];
        }
    }

    // getAllTransactions: Recupera tutte le transazioni (potrebbe essere lento con molti dati)
    async getAllTransactions(limit = 100) {
        try {
            const res = await this.db.query(
                'SELECT id, user_id, type, amount, timestamp, description FROM transactions ORDER BY timestamp DESC LIMIT $1',
                [limit]
            );
            return res.rows;
        } catch (error) {
            console.error('Errore nel recupero di tutte le transazioni:', error);
            return [];
        }
    }
}

module.exports = DataStore;