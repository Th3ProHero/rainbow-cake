import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dbDir = path.join(rootDir, ".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  port: 15439,
  user: "rcg",
  password: "rcg_secret_2024",
  persistent: true,
  initdbFlags: ["-E", "UTF8", "--locale=C"],
  onLog: (msg) => {
    if (msg && msg.trim()) console.log("[PG]", msg.trim());
  },
  onError: (err) => {
    if (err) console.error("[PG ERROR]", err);
  },
});

async function main() {
  const isInit = fs.existsSync(path.join(dbDir, "PG_VERSION"));
  if (!isInit) {
    console.log("Inicializando cluster PostgreSQL local con UTF-8...");
    await pg.initialise();
  }

  console.log("Iniciando PostgreSQL en puerto 15439...");
  await pg.start();
  console.log("PostgreSQL listo en puerto 15439 para Rainbow Cake GO.");

  try {
    await pg.createDatabase("rainbow_cake_go");
    console.log("Base de datos rainbow_cake_go asegurada.");
  } catch (err) {
    // Already exists
  }

  const cleanShutdown = async () => {
    console.log("Deteniendo PostgreSQL...");
    await pg.stop();
    console.log("PostgreSQL detenido.");
    process.exit(0);
  };

  process.on("SIGINT", cleanShutdown);
  process.on("SIGTERM", cleanShutdown);

  // Keep process alive
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  console.error("Error al iniciar servicio de BD:", err);
  process.exit(1);
});
