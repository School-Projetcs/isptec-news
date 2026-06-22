// Cria os .env em falta a partir dos .env.example (idempotente). Corre no `postinstall`
// e no arranque (bootStack), para que um clone novo nunca falhe por falta de DATABASE_URL.
import { ensureEnvFiles } from './dev-setup.mjs';

ensureEnvFiles();
