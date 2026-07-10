import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Pooled URL is fine for app + migrate on Supabase when both point at 5432.
    // If you later use Supabase pooler (6543), set DIRECT_URL to the direct 5432 URL
    // and prefer that for migrate deploy in CI if needed.
    url: env("DATABASE_URL"),
  },
});
