import { randomUUID } from "node:crypto";

let pool = null;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function getPool() {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (pool) return pool;

  const { Pool } = await import("pg");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

export async function dbHealth() {
  const p = await getPool();
  const result = await p.query("select now() as server_time, current_database() as database_name");
  return result.rows[0];
}

export async function listLostItems() {
  const p = await getPool();
  const { rows } = await p.query("select payload from lost_items order by created_at desc");
  return rows.map((row) => row.payload);
}

export async function upsertLostItem(item) {
  const p = await getPool();
  const id = String(item?.id || randomUUID());
  const payload = { ...item, id };
  await p.query(
    `insert into lost_items (id, reporter_email, title, status, payload)
     values ($1, $2, $3, $4, $5::jsonb)
     on conflict (id) do update set
       reporter_email = excluded.reporter_email,
       title = excluded.title,
       status = excluded.status,
       payload = excluded.payload,
       updated_at = now()`,
    [id, payload.reporterEmail || null, payload.title || null, payload.status || "Searching", JSON.stringify(payload)]
  );
  return payload;
}

export async function listFoundItems() {
  const p = await getPool();
  const { rows } = await p.query("select payload from found_items order by created_at desc");
  return rows.map((row) => row.payload);
}

export async function upsertFoundItem(item) {
  const p = await getPool();
  const id = String(item?.id || randomUUID());
  const payload = { ...item, id };
  await p.query(
    `insert into found_items (id, title, status, payload)
     values ($1, $2, $3, $4::jsonb)
     on conflict (id) do update set
       title = excluded.title,
       status = excluded.status,
       payload = excluded.payload,
       updated_at = now()`,
    [id, payload.title || null, payload.status || "Available", JSON.stringify(payload)]
  );
  return payload;
}

export async function listClaims() {
  const p = await getPool();
  const { rows } = await p.query("select payload from claims order by created_at desc");
  return rows.map((row) => row.payload);
}

export async function upsertClaim(claim) {
  const p = await getPool();
  const id = String(claim?.id || randomUUID());
  const payload = { ...claim, id };
  await p.query(
    `insert into claims (id, claimant_email, status, payload)
     values ($1, $2, $3, $4::jsonb)
     on conflict (id) do update set
       claimant_email = excluded.claimant_email,
       status = excluded.status,
       payload = excluded.payload,
       updated_at = now()`,
    [id, payload.claimantEmail || payload.userEmail || null, payload.status || "Pending Admin Review", JSON.stringify(payload)]
  );
  return payload;
}
