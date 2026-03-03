---
name: drizzle-expert
description: Drizzle ORM specific schema definition patterns, migrations workflow, and query optimization for serverless environments.
---

# Drizzle ORM Expert Guidelines

RentMate uses **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`). Follow these guidelines instead of generic Prisma or TypeORM patterns.

## 1. Schema Definitions
*   Use `drizzle-orm/pg-core` for Postgres.
*   Define tables, relationships, and types clearly. Export schemas and infer models (`typeof users.$inferSelect`) so they can be consumed securely by frontend types or backend utilities.
*   Keep relation definitions explicit to benefit from Drizzle's Relational Queries API.

## 2. Migrations Workflow (`drizzle-kit`)
*   **Generate:** Use `npm run generate` or `npx drizzle-kit generate` to draft migrations.
*   **Review:** Always review the generated raw SQL before running or pushing them, ensuring data retention policies are kept.
*   **Push:** Use standard migration tools depending on the environment. For Supabase projects, migrations should ultimately conform to `supabase/migrations` structure.

## 3. Query Optimization
*   Use Drizzle's relational capabilities: `db.query.[table].findMany({ with: { ... } })` for clean data fetching.
*   Avoid N+1 query patterns. Drizzle generates optimized SQL joins internally.
*   Select only the necessary fields using partial selects (`columns: { x: true }`) to save bandwidth in serverless edge functions.
