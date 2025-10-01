#!/usr/bin/env node
import { execSync } from 'node:child_process';
import readline from 'node:readline';

function sh(cmd) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

function trySh(cmd) {
  try { return sh(cmd); } catch { return null; }
}

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans); }));
}

function zero2(n) { return String(n).padStart(2, '0'); }

async function main() {
  // 1) Validar repo y rama
  const inRepo = trySh('git rev-parse --is-inside-work-tree');
  if (!inRepo) {
    console.error('[!] No es un repositorio Git aqui.');
    process.exit(1);
  }

  const currentBranch = sh('git branch --show-current');
  let targetBranch = currentBranch;
  if (currentBranch.toLowerCase() === 'main') {
    const pair = await ask('Numero de la pareja (1-7): ');
    if (!pair) { console.error('[!] Numero de pareja requerido.'); process.exit(1); }
    targetBranch = `pareja-${zero2(pair)}`;
    const checkout = trySh(`git checkout ${targetBranch}`);
    if (checkout === null) {
      console.log(`[i] Creando rama ${targetBranch}...`);
      sh(`git checkout -b ${targetBranch}`);
    }
  }

  // 2) Datos del commit
  const name = await ask('Nombre completo: ');
  const email = await ask('Correo institucional: ');
  const msg = await ask('Descripcion del trabajo (una linea): ');
  if (!name || !email || !msg) {
    console.error('[!] Nombre, correo y descripcion son obligatorios.');
    process.exit(1);
  }

  // 3) Config identidad local
  trySh(`git config user.name "${name}"`);
  trySh(`git config user.email "${email}"`);

  // 4) add/commit/push
  console.log('[1/3] git add -A');
  sh('git add -A');
  let hasDiff = true;
  try { execSync('git diff --cached --quiet'); hasDiff = false; } catch { hasDiff = true; }
  if (!hasDiff) {
    console.log('[i] No hay cambios para commitear.');
    process.exit(0);
  }
  console.log('[2/3] git commit');
  const pairTag = /^pareja-\d{2}$/.test(targetBranch) ? `[${targetBranch}] ` : '';
  const commitMsg = `${pairTag}${name} <${email}> - ${msg}`;
  sh(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  const hash = trySh('git rev-parse --short HEAD') || 'desconocido';
  console.log('[3/3] git push');
  try {
    sh(`git push -u origin ${targetBranch}`);
    console.log(`\n✔ Listo! Commit ${hash} enviado a origin/${targetBranch}.`);
  } catch {
    console.error(`\n[!] El push fallo. El commit local se creo (hash: ${hash}). Reintenta: git push -u origin ${targetBranch}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[!] Error inesperado:', err?.message || err);
  process.exit(1);
});
