import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../blockvote.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS wallet_pool (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eth_address TEXT UNIQUE NOT NULL,
            eth_private_key TEXT NOT NULL,
            in_use INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            roll_number TEXT UNIQUE NOT NULL,
            eth_address TEXT,
            eth_private_key TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS voter_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voter_id) REFERENCES voters(voter_id)
        );

        CREATE TABLE IF NOT EXISTS face_descriptors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id TEXT UNIQUE NOT NULL,
            descriptor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voter_id) REFERENCES voters(voter_id)
        );

        CREATE TABLE IF NOT EXISTS webauthn_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            voter_id TEXT NOT NULL,
            credential_id TEXT UNIQUE NOT NULL,
            public_key TEXT NOT NULL,
            sign_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (voter_id) REFERENCES voters(voter_id)
        );

        CREATE TABLE IF NOT EXISTS election_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_name TEXT NOT NULL,
            contract_address TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
    print("Database initialized")
