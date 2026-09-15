import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const migrationsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../supabase/migrations"
)

const entries = await readdir(migrationsDir, { withFileTypes: true })
const sqlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort()

if (sqlFiles.length === 0) {
  console.error(`No .sql files found in ${migrationsDir}`)
  process.exit(1)
}

for (const name of sqlFiles) {
  const filePath = path.join(migrationsDir, name)
  const contents = await readFile(filePath, "utf8")
  if (!contents.trim()) {
    console.error(`Migration is empty: ${name}`)
    process.exit(1)
  }
}

console.log(`OK: ${sqlFiles.length} migration file(s)`)
for (const name of sqlFiles) {
  console.log(`  ${name}`)
}
