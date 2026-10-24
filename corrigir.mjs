#!/usr/bin/env node
// Com o Baileys 7 (ESM nativo) o helper src/modules/whatsapp/baileys.ts nao e mais necessario.
// Este script desfaz o uso do helper: volta os imports para "@whiskeysockets/baileys",
// remove "const {...} = baileys;" e restaura imports de prisma/logger que tenham sumido
// em usePrismaAuthState.ts.   Uso:  node reverter-helper.mjs [--dry] [--sticker]
//   --dry      so mostra o que mudaria
//   --sticker  troca  import Sticker from "wa-sticker-formatter"  por  import { Sticker } from "wa-sticker-formatter"
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const doSticker = process.argv.includes("--sticker");
const srcDir = path.join(root, "src");
if (!fs.existsSync(srcDir)) { console.error("ERRO: rode na raiz do projeto (pasta com src/)."); process.exit(1); }
const helperNoExt = path.join(srcDir, "modules", "whatsapp", "baileys");
const backupDir = path.join(root, ".reverter-backup");
const rel = (f) => path.relative(root, f).split(path.sep).join("/");

const PKG_RE = /import\s+(?!type[\s{])([^;'"]*?)\s+from\s+(["'])@whiskeysockets\/baileys\2;?[ \t]*(\r?\n)?/g;
const HELPER_RE = /import\s+(?!type[\s{])([^;'"]*?)\s+from\s+(["'])((?:\.{1,2}\/|@\/)(?:[^"']*?\/)?baileys)\2;?[ \t]*(\r?\n)?/g;
const CONST_DESTRUCT_RE = /^[ \t]*const\s*\{([^}]*)\}\s*=\s*baileys\s*(?:as\s+any\s*)?;?[ \t]*\r?\n?/gm;
const CONST_DEFAULT_RE = /^[ \t]*const\s+(\w+)\s*(?::[^=\n]+)?=\s*\(?\s*baileys\s+as\s+any\s*\)?\.default[^\n]*\r?\n?/gm;

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p);
  } return out;
}
function parseClause(clause) {
  const c = clause.trim();
  const braces = c.match(/\{([\s\S]*)\}/);
  const def = c.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim() || null;
  const items = braces ? braces[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { def, items };
}
const resolvesToHelper = (file, spec) => {
  const abs = spec.startsWith("@/") ? path.join(srcDir, spec.slice(2)) : path.resolve(path.dirname(file), spec);
  return path.normalize(abs) === path.normalize(helperNoExt);
};
const baseName = (it) => it.split(/\s+as\s+/)[0].replace(/^type\s+/, "");

const plans = [];
for (const file of walk(srcDir)) {
  if (path.normalize(file) === path.normalize(helperNoExt + ".ts")) continue;
  const orig = fs.readFileSync(file, "utf8");
  const eol = orig.includes("\r\n") ? "\r\n" : "\n";
  let out = orig;
  const notes = [];

  const helperMatches = [...orig.matchAll(HELPER_RE)].filter((m) => resolvesToHelper(file, m[3]));
  const cd = [...orig.matchAll(CONST_DESTRUCT_RE)];
  const cdef = [...orig.matchAll(CONST_DEFAULT_RE)];

  if (helperMatches.length || cd.length || cdef.length) {
    // nomes que precisam voltar a vir do pacote
    let wantDefault = null; const wantNamed = [];
    const addNamed = (it) => { if (!wantNamed.some((x) => baseName(x) === baseName(it))) wantNamed.push(it); };
    for (const m of helperMatches) for (const it of parseClause(m[1]).items) {
      if (baseName(it) === "makeWASocket") wantDefault = it.includes(" as ") ? it.split(/\s+as\s+/)[1] : "makeWASocket"; else addNamed(it);
    }
    for (const m of cd) for (const part of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      const [n, a] = part.split(":").map((s) => s.trim()); if (n === "makeWASocket") wantDefault ||= a || n; else addNamed(a && a !== n ? `${n} as ${a}` : n);
    }
    for (const m of cdef) wantDefault ||= m[1];

    const pkg = [...orig.matchAll(PKG_RE)];
    const have = new Set(); let haveDefault = null;
    for (const m of pkg) { const p = parseClause(m[1]); if (p.def) haveDefault = p.def; p.items.forEach((i) => have.add(baseName(i))); }
    const needNamed = wantNamed.filter((i) => !have.has(baseName(i)));
    const needDefault = wantDefault && !haveDefault ? wantDefault : null;

    // 1) remover imports do helper e consts soltas
    const spans = helperMatches.map((m) => ({ i: m.index, len: m[0].length }));
    let firstHelperPos = spans.length ? spans[0].i : -1;
    for (let k = spans.length - 1; k >= 0; k--) out = out.slice(0, spans[k].i) + out.slice(spans[k].i + spans[k].len);
    out = out.replace(CONST_DESTRUCT_RE, "").replace(CONST_DEFAULT_RE, "");

    // 2) incluir os nomes no import do pacote (ou criar um)
    if (needNamed.length || needDefault) {
      const pkg2 = [...out.matchAll(PKG_RE)];
      if (pkg2.length) {
        const m = pkg2[0]; const p = parseClause(m[1]);
        const def = p.def || needDefault; const items = [...p.items, ...needNamed];
        const stmt = `import ${def ? def + (items.length ? ", " : "") : ""}${items.length ? "{ " + items.join(", ") + " }" : ""} from "@whiskeysockets/baileys";${m[3] ? eol : ""}`;
        out = out.slice(0, m.index) + stmt + out.slice(m.index + m[0].length);
      } else {
        const stmt = `import ${needDefault ? needDefault + (needNamed.length ? ", " : "") : ""}${needNamed.length ? "{ " + needNamed.join(", ") + " }" : ""} from "@whiskeysockets/baileys";${eol}`;
        const pos = firstHelperPos >= 0 ? Math.min(firstHelperPos, out.length) : 0;
        out = out.slice(0, pos) + stmt + out.slice(pos);
      }
    }
    notes.push("imports do helper revertidos para @whiskeysockets/baileys");
  }

  // prisma / logger sumidos em usePrismaAuthState.ts
  if (/auth[\\/]usePrismaAuthState\.ts$/.test(file)) {
    const missing = [];
    const declared = (n) => new RegExp(`import\\s*\\{[^}]*\\b${n}\\b[^}]*\\}|const\\s+${n}\\b|let\\s+${n}\\b|function\\s+${n}\\b`).test(out);
    if (/\bprisma\s*\./.test(out) && !declared("prisma") && fs.existsSync(path.join(srcDir, "lib", "prisma.ts"))) missing.push('import { prisma } from "@/lib/prisma";');
    if (/\blogger\s*\./.test(out) && !declared("logger") && fs.existsSync(path.join(srcDir, "lib", "logger.ts"))) missing.push('import { logger } from "@/lib/logger";');
    if (missing.length) { out = missing.join(eol) + eol + out; notes.push("restaurado: " + missing.map((x) => x.match(/\{ (\w+) \}/)[1]).join(", ")); }
  }

  if (doSticker && /import\s+Sticker\s+from\s+["']wa-sticker-formatter["']/.test(out)) {
    out = out.replace(/import\s+Sticker\s+from\s+(["'])wa-sticker-formatter\1/, 'import { Sticker } from "wa-sticker-formatter"');
    notes.push("Sticker -> import nomeado");
  }
  if (out !== orig) plans.push({ file, orig, out, notes });
}

if (!plans.length) console.log("Nada para corrigir (nenhum import do helper nem consts soltas encontrados).");
for (const p of plans) {
  console.log(`${dry ? "[dry] " : "OK  "}${rel(p.file)}  (${p.notes.join("; ")})`);
  if (!dry) {
    const dest = path.join(backupDir, path.relative(root, p.file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, p.orig); fs.writeFileSync(p.file, p.out);
  }
}
if (!dry && plans.length) console.log(`\nOriginais salvos em ${path.relative(root, backupDir)}/`);
console.log("\nProximo passo: node diagnostico2.mjs --no-tsc   (ou npm run dev)");
