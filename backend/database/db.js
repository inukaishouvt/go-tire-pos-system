const { createClient } = require('@libsql/client');

// Turso credentials (hardcoded for personal testing project)
const TURSO_URL = (process.env.TURSO_DATABASE_URL || 'libsql://pos-denis0vich.aws-ap-northeast-1.turso.io').trim();
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjM5MTcxNjAsImlkIjoiYjk1Y2MxMzQtODY5Yy00ZmIzLTk0ZjctNTYzYzFmMDE3NjJkIiwicmlkIjoiNWU5YTk1YWItMmJhNC00NDQ4LTllNTYtYjE0NGUwZjlmYTdhIn0.63ZD-8hlImspBBF3IqgrHaJ1XpflyyTSWOTd3khVsLW5XeOp1KxstuYbR4Sjp37IcZTjLixPKNYJ2r0CPxg1AQ').trim();

// Use Turso if credentials are available, otherwise fall back to local SQLite
const useTurso = TURSO_URL && TURSO_TOKEN;

class Database {
    constructor() {
        if (useTurso) {
            // Connect to Turso (remote SQLite)
            this.client = createClient({
                url: TURSO_URL,
                authToken: TURSO_TOKEN
            });
            console.log('✅ Connected to Turso database:', TURSO_URL);
        } else {
            // Fallback to local SQLite for development
            const sqlite3 = require('sqlite3').verbose();
            const path = require('path');
            const dbPath = path.join(__dirname, 'pos.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                } else {
                    console.log('Connected to local SQLite database');
                }
            });
        }
    }

    // Generic query method
    async query(sql, params = []) {
        if (useTurso) {
            const result = await this.client.execute(sql, params);
            // libSQL returns rows as an array of objects, but we need to convert to plain objects
            return result.rows.map(row => {
                const obj = {};
                // Handle both array-like and object-like row formats
                if (Array.isArray(result.columns)) {
                    result.columns.forEach((col, idx) => {
                        obj[col] = row[idx];
                    });
                } else {
                    // If it's already an object, use it directly
                    Object.assign(obj, row);
                }
                return obj;
            });
        } else {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        }
    }

    // Generic run method for INSERT, UPDATE, DELETE
    async run(sql, params = []) {
        // Handle transaction commands specially
        const sqlUpper = sql.trim().toUpperCase();
        if (sqlUpper.startsWith('BEGIN') || sqlUpper.startsWith('COMMIT') || sqlUpper.startsWith('ROLLBACK')) {
            return await this.executeTransactionCommand(sql);
        }

        if (useTurso) {
            const result = await this.client.execute(sql, params);
            // libSQL returns lastInsertRowid and rowsAffected
            // result.lastInsertRowid might be a BigInt, convert to Number
            let lastId = undefined;
            if (result.lastInsertRowid !== undefined) {
                lastId = typeof result.lastInsertRowid === 'bigint'
                    ? Number(result.lastInsertRowid)
                    : result.lastInsertRowid;
            }
            return {
                id: lastId,
                changes: result.rowsAffected || 0
            };
        } else {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, changes: this.changes });
                    }
                });
            });
        }
    }

    // Get single row
    async get(sql, params = []) {
        if (useTurso) {
            const result = await this.client.execute(sql, params);
            if (result.rows.length === 0) {
                return undefined;
            }
            const row = result.rows[0];
            const obj = {};
            // Handle both array-like and object-like row formats
            if (Array.isArray(result.columns)) {
                result.columns.forEach((col, idx) => {
                    obj[col] = row[idx];
                });
            } else {
                // If it's already an object, use it directly
                Object.assign(obj, row);
            }
            return obj;
        } else {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        }
    }

    // Transaction support
    async transaction(callback) {
        if (useTurso) {
            // Turso uses batch API for transactions
            return await this.client.batch([
                // The callback will provide the statements
            ], 'write');
        } else {
            // Local SQLite transaction
            await this.run('BEGIN TRANSACTION');
            try {
                const result = await callback();
                await this.run('COMMIT');
                return result;
            } catch (error) {
                await this.run('ROLLBACK');
                throw error;
            }
        }
    }

    // Execute multiple statements in a transaction (Turso batch)
    async batch(statements) {
        if (useTurso) {
            // Convert statements to libSQL batch format
            const batchStatements = statements.map(stmt => ({
                sql: stmt.sql,
                args: stmt.params || []
            }));
            const result = await this.client.batch(batchStatements, 'write');
            return result;
        } else {
            // Local SQLite: execute in transaction
            await this.run('BEGIN TRANSACTION');
            try {
                const results = [];
                for (const stmt of statements) {
                    const result = await this.run(stmt.sql, stmt.params || []);
                    results.push(result);
                }
                await this.run('COMMIT');
                return results;
            } catch (error) {
                await this.run('ROLLBACK');
                throw error;
            }
        }
    }

    // Handle transaction commands (BEGIN, COMMIT, ROLLBACK)
    async executeTransactionCommand(sql) {
        if (useTurso) {
            // Turso doesn't support explicit BEGIN/COMMIT/ROLLBACK
            // Each execute() is already atomic, so we just ignore these commands
            const sqlUpper = sql.trim().toUpperCase();
            if (sqlUpper.startsWith('BEGIN')) {
                // No-op for Turso - transactions are implicit
                return { id: undefined, changes: 0 };
            }
            if (sqlUpper.startsWith('COMMIT')) {
                // No-op for Turso
                return { id: undefined, changes: 0 };
            }
            if (sqlUpper.startsWith('ROLLBACK')) {
                // No-op for Turso (can't rollback without explicit transaction)
                // Note: This means errors won't rollback in Turso, but each operation is atomic
                return { id: undefined, changes: 0 };
            }
            // Shouldn't reach here, but just in case
            return { id: undefined, changes: 0 };
        } else {
            // Local SQLite: execute transaction commands normally
            return new Promise((resolve, reject) => {
                this.db.run(sql, [], function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: undefined, changes: 0 });
                    }
                });
            });
        }
    }

    // Check if a table exists
    async hasTable(tableName) {
        try {
            const result = await this.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
            return !!result;
        } catch (error) {
            console.error(`Error checking if table ${tableName} exists:`, error);
            return false;
        }
    }

    // Check if a column exists in a table
    async hasColumn(tableName, columnName) {
        try {
            const columns = await this.query(`PRAGMA table_info(${tableName})`);
            return columns.some(col => col.name === columnName);
        } catch (error) {
            console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
            return false;
        }
    }

    // Close database connection
    async close() {
        if (useTurso) {
            this.client.close();
            return Promise.resolve();
        } else {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }
}

module.exports = Database;
