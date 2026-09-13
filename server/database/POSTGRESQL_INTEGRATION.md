# PostgreSQL integration

This version is PostgreSQL-ready while preserving the current browser/localStorage prototype so the UI can still run without a database.

## 1. Install dependencies

```bash
npm install
```

The project includes the `pg` PostgreSQL driver.

## 2. Create the database schema

Run `server/database/schema.sql` against your PostgreSQL database.

Example with psql:

```bash
psql "$DATABASE_URL" -f server/database/schema.sql
```

## 3. Configure `.env`

```env
DATABASE_URL=postgresql://username:password@localhost:5432/lost_found
DATABASE_SSL=false
DATABASE_POOL_MAX=10
```

For hosted PostgreSQL providers that require TLS, set `DATABASE_SSL=true`.

## 4. Backend endpoints already available

- `GET /api/db/health`
- `GET /api/db/lost-items`
- `POST /api/db/lost-items`
- `GET /api/db/found-items`
- `POST /api/db/found-items`
- `GET /api/db/claims`
- `POST /api/db/claims`

These endpoints store the full existing application object in JSONB while also indexing important fields. That makes migration from the current localStorage structure straightforward and avoids changing the AI matching/claim evidence shapes.

## 5. Recommended next integration step

Replace the localStorage calls in the frontend service layer with these REST endpoints. Keep sensitive verification answers server-side in production and return only the minimum information needed by normal users. Admin evidence routes should require authenticated admin authorization before returning question answers.
