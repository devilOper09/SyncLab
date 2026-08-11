import pkg from "pg";

const { Pool } = pkg

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
})

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export default pool