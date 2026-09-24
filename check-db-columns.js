require("dotenv").config({ path: ".env.local" });

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const result = await client.query(`
    SELECT
      table_name,
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_name IN ('fees', 'payments')
    ORDER BY table_name, ordinal_position
  `);

  console.table(result.rows);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});