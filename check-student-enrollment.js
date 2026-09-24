require("dotenv").config({ path: ".env.local" });
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });

  await c.connect();

  const r = await c.query(`
    SELECT
      e.id,
      e.status,
      e.student_id,
      e.batch_id,
      e.course_id,
      e.programme_id,
      b.name AS batch_name,
      b.status AS batch_status,
      b.course_id AS batch_course_id,
      b.programme_id AS batch_programme_id,
      p.name AS programme_name,
      p.programme_no,
      co.name AS course_name,
      co.course_no
    FROM enrollments e
    LEFT JOIN batches b
      ON b.id = e.batch_id
    LEFT JOIN programmes p
      ON p.id = COALESCE(e.programme_id, b.programme_id)
    LEFT JOIN courses co
      ON co.id = COALESCE(e.course_id, b.course_id)
    WHERE e.student_id = (
      SELECT id
      FROM students
      WHERE user_id = (
        SELECT id
        FROM users
        WHERE email = 'gjhgjg@gmail.com'
        LIMIT 1
      )
      LIMIT 1
    )
    ORDER BY e.id DESC
  `);

  console.table(r.rows);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
