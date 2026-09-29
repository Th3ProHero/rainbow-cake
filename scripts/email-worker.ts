import { processEmailOutbox } from "../src/lib/email/worker";

async function run() {
  console.log("Iniciando procesamiento de cola de correos...");
  const res = await processEmailOutbox(50);
  console.log(`Procesados: ${res.processed} | Enviados: ${res.sent} | Fallidos: ${res.failed}`);
  if (res.errors.length > 0) {
    console.error("Errores:", res.errors);
  }
}

run()
  .catch((err) => {
    console.error("Error fatal en email-worker:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
