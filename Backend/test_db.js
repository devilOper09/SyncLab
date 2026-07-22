import dotenv from "dotenv"
import pkg from "pg"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, ".env") })

const { Pool } = pkg
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false
  }
})

try {
  console.log("Testing database connection...")
  const res = await pool.query("SELECT NOW()")
  console.log("Connection successful! Time:", res.rows[0].now)
} catch (error) {
  console.error("Connection failed:", error)
} finally {
  await pool.end()
}
