# karch-migration — Create an Expand-Contract Migration

## Purpose
Create a zero-downtime database migration following the expand-contract pattern. Production code and database deploys are not atomic — migrations must be backward-compatible at every step to avoid downtime.

## When to use this skill
Any time a schema change is needed that would break existing code if applied atomically:
- Renaming a column or table
- Making a nullable column NOT NULL
- Splitting one column into two
- Changing a column's type
- Dropping a column or table

Simple additive changes (new nullable column, new table with no FK constraints) do not require expand-contract — a single migration is fine.

## The expand-contract pattern

```
Step 1 — EXPAND   → Add the new column/table (nullable or with default).
                     Deploy. Old code and new code both work.

Step 2 — MIGRATE  → Backfill existing data (separate script, not in the migration).
                     Update app code to write to both old and new columns.
                     Deploy. No downtime.

Step 3 — CONTRACT → Remove the old column/table (only when no code references it).
                     Deploy final.
```

Each step is a **separate PR and deploy**. Never combine EXPAND + CONTRACT in one migration.

## Steps

### 1. Analyze the change
Identify which pattern applies:
- **Column rename**: `name` → `fullName`
- **Column type change**: `VARCHAR` → `TEXT`
- **NOT NULL constraint**: add constraint to existing nullable column
- **Column removal**: drop a column still referenced by code
- **Table restructure**: split or merge tables

### 2. Plan the three migrations

**EXPAND migration** — `prisma/migrations/<timestamp>_expand_<description>/migration.sql`:
```sql
-- Example: rename "name" to "fullName"
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
-- fullName is nullable — old code still writes to "name", new code writes to both
```

**MIGRATE script** — `scripts/migrate-<description>.ts` (runs separately, not in Prisma migration):
```typescript
// scripts/migrate-fullname.ts
import { prisma } from '../src/lib/db'

async function main() {
  const users = await prisma.user.findMany({ where: { fullName: null } })
  console.log(`Backfilling ${users.length} users...`)

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { fullName: user.name },
    })
  }
  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

**CONTRACT migration** — `prisma/migrations/<timestamp>_contract_<description>/migration.sql`:
```sql
-- Only after verifying no code references "name" in production
ALTER TABLE "User" DROP COLUMN "name";
ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;
```

### 3. Update Prisma schema for each step

**After EXPAND:**
```prisma
model User {
  id       String  @id
  name     String  // still here — old code uses it
  fullName String? // new — nullable during transition
}
```

**After MIGRATE (dual-write phase):**
```typescript
// App writes to both during transition
await prisma.user.update({
  where: { id },
  data: { name: value, fullName: value },
})
```

**After CONTRACT:**
```prisma
model User {
  id       String @id
  fullName String // NOT NULL — migration complete
}
```

### 4. Test each migration step locally
```bash
# After EXPAND
npx prisma migrate dev --name expand_rename_name_to_fullname
npx vitest run   # all tests must pass

# Run backfill script
npx tsx scripts/migrate-fullname.ts

# After CONTRACT
npx prisma migrate dev --name contract_drop_name_column
npx vitest run   # all tests must pass
```

### 5. Preview the SQL before applying in production
```bash
npx prisma migrate diff \
  --from-schema-datasource ./prisma/schema.prisma \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script
```

### 6. Production deployment procedure
```
EXPAND PR:
  - Run in CI (preview DB): npx prisma migrate deploy
  - Manual in production: human reviews diff, approves, runs: npx prisma migrate deploy
  - Verify: npx prisma migrate status

MIGRATE PR:
  - Run backfill script on production DB: npx tsx scripts/migrate-<name>.ts
  - Verify all rows backfilled: SELECT COUNT(*) FROM "User" WHERE "fullName" IS NULL;

CONTRACT PR:
  - Run in CI (preview DB): npx prisma migrate deploy
  - Manual in production: same review → approve → deploy
  - Verify: check app is working normally in Sentry/health endpoint
```

**Production migrations are NEVER automatic.** The agent prepares the commands; the human reviews and approves before they run.

## Rollback strategy
Prisma has no native rollback. Options:

1. **Preferred**: create a new migration that undoes the change (compatible with expand-contract)
2. **Emergency**: restore PostgreSQL backup and re-apply migrations up to the previous point
   ```bash
   pg_restore -d $DATABASE_URL backup.dump
   npx prisma migrate deploy
   ```

**Never delete migration files** from `prisma/migrations/`. They are the database history.

## Deliverables checklist
- [ ] EXPAND migration file created and tested locally
- [ ] Prisma schema updated for EXPAND state
- [ ] Backfill script created and tested on a copy of production data
- [ ] Dual-write code updated (writes to both old and new columns during transition)
- [ ] CONTRACT migration file created (not applied until MIGRATE step is verified)
- [ ] All tests green at each step
- [ ] `docs/adr/` draft created if this migration reflects an architectural decision
