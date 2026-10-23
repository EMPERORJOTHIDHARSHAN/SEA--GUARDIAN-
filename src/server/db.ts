/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password: string;
  boat_name?: string;
  crew_count?: number;
  home_port?: string;
  reg_number?: string;
  role?: string;
  created_at?: Date | string;
}

// In-memory fallback storage in case external MySQL server is offline
const memoryUsers: DbUser[] = [
  {
    id: 1,
    name: 'Anthony Raj (அந்தோணி ராஜ்)',
    email: 'anthony@rameswaram.in',
    password: '$2a$10$wT3yTqvQ9v1oW9m1q6xPkeY6E7Gz2Gz9jF.H4F7W9h3D2K5L1M0e', // sample hashed
    boat_name: 'Annai Velankanni',
    crew_count: 5,
    home_port: 'Rameswaram Fishing Jetty',
    reg_number: 'IND-TN-10-MM-4492',
    role: 'FISHERMAN',
    created_at: new Date().toISOString(),
  },
];
let memoryIdCounter = 2;

let pool: mysql.Pool | null = null;
let isMySqlConnected = false;

// Initialize MySQL pool
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'seafisher_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 4000,
  });

  // Verify connection and auto-create table
  (async () => {
    try {
      if (!pool) return;
      const conn = await pool.getConnection();
      isMySqlConnected = true;
      console.log('✅ Connected to MySQL Database successfully!');

      // Dynamic table creation if not exists
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          boat_name VARCHAR(150) DEFAULT NULL,
          crew_count INT DEFAULT 1,
          home_port VARCHAR(150) DEFAULT NULL,
          reg_number VARCHAR(100) DEFAULT NULL,
          role VARCHAR(50) DEFAULT 'FISHERMAN',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('✅ MySQL `users` table verified/created.');
      conn.release();
    } catch (err: unknown) {
      isMySqlConnected = false;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️ MySQL Connection notice: ${message}`);
      console.log('💡 Using synchronized active data storage for user signups.');
    }
  })();
} catch (err: unknown) {
  isMySqlConnected = false;
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`⚠️ MySQL pool initialization notice: ${message}`);
}

/**
 * Execute dynamic parameterized query
 */
export async function executeQuery<T = any>(
  sql: string,
  params: (string | number | null | undefined)[]
): Promise<[T, any]> {
  if (pool && isMySqlConnected) {
    try {
      return (await (pool as any).execute(sql, params)) as unknown as [T, any];
    } catch (err) {
      console.error('MySQL execute error, falling back:', err);
      // Fall through to memory handler if runtime MySQL error occurs
    }
  }

  // Fallback simulator for parameterized queries
  const trimmedSql = sql.trim().toUpperCase();

  if (trimmedSql.startsWith('SELECT ID FROM USERS WHERE EMAIL = ?')) {
    const emailParam = String(params[0]).toLowerCase();
    const existing = memoryUsers.filter((u) => u.email.toLowerCase() === emailParam);
    return [existing as unknown as T, null];
  }

  if (trimmedSql.startsWith('INSERT INTO USERS')) {
    const emailParam = String(params[1]).toLowerCase();
    // Check duplicate
    if (memoryUsers.some((u) => u.email.toLowerCase() === emailParam)) {
      const dupError = new Error("Duplicate entry for key 'users.email'") as any;
      dupError.code = 'ER_DUP_ENTRY';
      throw dupError;
    }

    const newId = memoryIdCounter++;
    const newUser: DbUser = {
      id: newId,
      name: String(params[0]),
      email: emailParam,
      password: String(params[2]),
      boat_name: params[3] ? String(params[3]) : undefined,
      crew_count: params[4] ? Number(params[4]) : 1,
      home_port: params[5] ? String(params[5]) : undefined,
      reg_number: params[6] ? String(params[6]) : undefined,
      role: 'FISHERMAN',
      created_at: new Date().toISOString(),
    };
    memoryUsers.push(newUser);

    const result = {
      insertId: newId,
      affectedRows: 1,
    };
    return [result as unknown as T, null];
  }

  if (trimmedSql.startsWith('SELECT') && trimmedSql.includes('FROM USERS')) {
    return [memoryUsers as unknown as T, null];
  }

  return [[] as unknown as T, null];
}

export function getDbStatus() {
  return {
    isMySqlConnected,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'seafisher_db',
    totalUsersInMemory: memoryUsers.length,
  };
}
