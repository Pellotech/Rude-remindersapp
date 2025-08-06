import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use local PostgreSQL instead of Neon
const databaseConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'postgres',
  ssl: false // Disable SSL for local PostgreSQL
};

// Create connection string from individual parts
const connectionString = `postgresql://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`;

console.log('Connecting to database:', `postgresql://${databaseConfig.user}:***@${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database}`);

export const pool = new Pool({ 
  ...databaseConfig
});

export const db = drizzle({ client: pool, schema });