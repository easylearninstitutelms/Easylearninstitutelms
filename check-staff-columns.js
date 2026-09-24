require("dotenv").config({ path: ".env.local" });

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'staff'
      ORDER BY ordinal_position
    `);

    console.log("\nSTAFF TABLE COLUMNS:\n");

    for (const row of result.rows) {
      console.log(row.column_name);
    }
  } catch (error) {
    console.error("\nDATABASE ERROR:");
    console.error(error.message);
  } finally {
    await client.end();
  }
}

main();