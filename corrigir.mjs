#!/usr/bin/env node
// corrigir-tudo.mjs - aplica TODAS as correcoes vistas ate agora no MarcFlow / M7 Connect.
//   node corrigir-tudo.mjs --dry        -> mostra o que mudaria, sem gravar nada
//   node corrigir-tudo.mjs              -> aplica (backup em .corrigir-tudo-backup/)
// Opcoes: --sticker (troca import default do wa-sticker-formatter por import nomeado)
//         --no-db (nao altera o banco)  --no-tsc (pula o tsc final)  --tz=America/Sao_Paulo
// Idempotente: pode rodar varias vezes. Relatorio: corrigir-tudo-relatorio.txt
import fs from "node:fs";
import path from "node:path";
import { createRequire, builtinModules } from "node:module";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry"), STICKER = argv.includes("--sticker"), NODB = argv.includes("--no-db"), NOTSC = argv.includes("--no-tsc");
const tzArg = (argv.find((a) => a.startsWith("--tz=")) || "").slice(5);
const req = createRequire(path.join(root, "package.json"));
const srcDir = path.join(root, "src");
const backupDir = path.join(root, ".corrigir-tudo-backup");
const out = [];
const P = (s = "") => { out.push(s); console.log(s); };
const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const rd = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const validTz = (tz) => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; } };
const warnings = [], manual = [];

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(srcDir)) { console.error("ERRO: rode na raiz do projeto (onde ficam package.json e src/)."); process.exit(1); }

// ---------- arquivos "em preparo": nada e gravado ate o fim (e nada com --dry)
const staged = new Map();
const cur = (f) => staged.get(f)?.text ?? rd(f);
const stage = (f, text, why) => { const e = staged.get(f) || { orig: rd(f), notes: [] }; e.text = text; if (!e.notes.includes(why)) e.notes.push(why); staged.set(f, e); };
function walk(d, out2 = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out2); else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) out2.push(p);
  } return out2;
}
const files = walk(srcDir);

// =====================================================================  1. .ENV
P("=== 1. .env ===");
const envF = path.join(root, ".env");
let envText = rd(envF);
let targetTz = tzArg || "America/Sao_Paulo";
if (tzArg && !validTz(tzArg)) { console.error(`Fuso invalido: ${tzArg}`); process.exit(1); }
if (envText === null) { P("  .env nao encontrado (pulando)."); }
else {
  const eol = envText.includes("\r\n") ? "\r\n" : "\n";
  let t = envText;
  const getv = (k) => (t.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*?)\\s*$`, "m")) || [])[1]?.replace(/^["']|["']$/g, "");
  const setv = (k, v) => { t = t.replace(new RegExp(`^(\\s*${k}\\s*=\\s*).*$`, "m"), `$1"${v}"`); };
  const tz = getv("TZ");
  if (tz !== undefined && !tzArg && validTz(tz) && tz !== "Asia/Jakarta") targetTz = tz;
  if (tz !== undefined) {
    if (!validTz(tz) || tz === "Asia/Jakarta") {
      const fixed = /^america\/s[aã]o[-_ ]?paulo$/i.test(tz) ? "America/Sao_Paulo" : targetTz;
      setv("TZ", fixed); targetTz = fixed; stage(envF, t, `TZ "${tz}" -> "${fixed}"`); P(`  TZ: "${tz}" -> "${fixed}"`);
    } else P(`  TZ ok (${tz})`);
  } else { t = t.replace(/\s*$/, "") + `${eol}TZ="${targetTz}"${eol}`; stage(envF, t, `TZ="${targetTz}" adicionado`); P(`  TZ adicionado: ${targetTz}`); }
  const loc = getv("LOCALE"); if (loc === "id-ID") { setv("LOCALE", "pt-BR"); stage(envF, t, 'LOCALE id-ID -> pt-BR'); P("  LOCALE: id-ID -> pt-BR"); }
  if (t !== envText && !staged.has(envF)) stage(envF, t, "ajustes");
  const dbu = getv("DATABASE_URL") || "";
  if (/:password@|wa_gateway_db/.test(dbu)) warnings.push("DATABASE_URL ainda tem valores de exemplo (password / wa_gateway_db).");
  if (/your-super-secret|change-this/i.test(getv("AUTH_SECRET") || "")) warnings.push("AUTH_SECRET e o valor de exemplo. Gere um novo (ex.: openssl rand -base64 32).");
  if (getv("ADMIN_PASSWORD") === "Ana291205") warnings.push("ADMIN_PASSWORD no .env e a senha que foi exposta em conversa. Troque-a (e a do admin do painel).");
}

// =====================================================================  2. BAILEYS (imports)
P("\n=== 2. IMPORTS DO BAILEYS ===");
const bailPkg = readJson(path.join(root, "node_modules/@whiskeysockets/baileys/package.json"));
const bailEsm = bailPkg?.type === "module";
P(`  Baileys instalado: ${bailPkg ? bailPkg.version + (bailEsm ? " (ESM nativo)" : " (CommonJS)") : "NAO INSTALADO"}`);
const helperNoExt = path.join(srcDir, "modules", "whatsapp", "baileys");
const PKG_RE = /import\s+(?!type[\s{])([^;'"]*?)\s+from\s+(["'])@whiskeysockets\/baileys\2;?[ \t]*(\r?\n)?/g;
const HELPER_RE = /import\s+(?!type[\s{])([^;'"]*?)\s+from\s+(["'])((?:\.{1,2}\/|@\/)(?:[^"']*?\/)?baileys)\2;?[ \t]*(\r?\n)?/g;
const CONST_DESTRUCT_RE = /^[ \t]*const\s*\{([^}]*)\}\s*=\s*baileys\s*(?:as\s+any\s*)?;?[ \t]*\r?\n?/gm;
const CONST_DEFAULT_RE = /^[ \t]*const\s+(\w+)\s*(?::[^=\n]+)?=\s*\(?\s*baileys\s+as\s+any\s*\)?\.default[^\n]*\r?\n?/gm;
const parseClause = (clause) => { const c = clause.trim(); const b = c.match(/\{([\s\S]*)\}/); return { def: c.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim() || null, items: b ? b[1].split(",").map((s) => s.trim()).filter(Boolean) : [] }; };
const resolvesToHelper = (file, spec) => path.normalize(spec.startsWith("@/") ? path.join(srcDir, spec.slice(2)) : path.resolve(path.dirname(file), spec)) === path.normalize(helperNoExt);
const baseName = (it) => it.split(/\s+as\s+/)[0].replace(/^type\s+/, "");

if (!bailEsm) {
  warnings.push("O Baileys instalado nao e a v7 (ESM). Este script assume o Baileys 7: rode 'npm install @whiskeysockets/baileys@7.0.0-rc.9' e execute de novo. Pulei a correcao de imports.");
  P("  pulado (Baileys nao e ESM)");
} else {
  let n = 0;
  for (const file of files) {
    if (path.normalize(file) === path.normalize(helperNoExt + ".ts")) continue;
    const orig = cur(file); if (!orig.includes("baileys")) continue;
    const eol = orig.includes("\r\n") ? "\r\n" : "\n";
    let o = orig; const notes = [];
    const hm = [...o.matchAll(HELPER_RE)].filter((m) => resolvesToHelper(file, m[3]));
    const cd = [...o.matchAll(CONST_DESTRUCT_RE)], cdef = [...o.matchAll(CONST_DEFAULT_RE)];
    if (hm.length || cd.length || cdef.length) {
      let wantDefault = null; const wantNamed = [];
      const addN = (it) => { if (!wantNamed.some((x) => baseName(x) === baseName(it))) wantNamed.push(it); };
      for (const m of hm) for (const it of parseClause(m[1]).items) { if (baseName(it) === "makeWASocket") wantDefault = it.includes(" as ") ? it.split(/\s+as\s+/)[1] : "makeWASocket"; else addN(it); }
      for (const m of cd) for (const part of m[1].split(",").map((s) => s.trim()).filter(Boolean)) { const [nm, al] = part.split(":").map((s) => s.trim()); if (nm === "makeWASocket") wantDefault ||= al || nm; else addN(al && al !== nm ? `${nm} as ${al}` : nm); }
      for (const m of cdef) wantDefault ||= m[1];
      const have = new Set(); let haveDef = null;
      for (const m of o.matchAll(PKG_RE)) { const p = parseClause(m[1]); if (p.def) haveDef = p.def; p.items.forEach((i) => have.add(baseName(i))); }
      const needNamed = wantNamed.filter((i) => !have.has(baseName(i)));
      const needDef = wantDefault && !haveDef ? wantDefault : null;
      const firstPos = hm.length ? hm[0].index : -1;
      for (let k = hm.length - 1; k >= 0; k--) o = o.slice(0, hm[k].index) + o.slice(hm[k].index + hm[k][0].length);
      o = o.replace(CONST_DESTRUCT_RE, "").replace(CONST_DEFAULT_RE, "");
      if (needNamed.length || needDef) {
        const pk = [...o.matchAll(PKG_RE)];
        if (pk.length) { const m = pk[0], p = parseClause(m[1]); const def = p.def || needDef; const items = [...p.items, ...needNamed];
          o = o.slice(0, m.index) + `import ${def ? def + (items.length ? ", " : "") : ""}${items.length ? "{ " + items.join(", ") + " }" : ""} from "@whiskeysockets/baileys";${m[3] ? eol : ""}` + o.slice(m.index + m[0].length); }
        else { const stmt = `import ${needDef ? needDef + (needNamed.length ? ", " : "") : ""}${needNamed.length ? "{ " + needNamed.join(", ") + " }" : ""} from "@whiskeysockets/baileys";${eol}`; const pos = firstPos >= 0 ? Math.min(firstPos, o.length) : 0; o = o.slice(0, pos) + stmt + o.slice(pos); }
      }
      notes.push("imports do helper revertidos para @whiskeysockets/baileys");
    }
    if (/auth[\\/]usePrismaAuthState\.ts$/.test(file)) {
      const miss = []; const decl = (nm) => new RegExp(`import\\s*\\{[^}]*\\b${nm}\\b[^}]*\\}|const\\s+${nm}\\b|let\\s+${nm}\\b|function\\s+${nm}\\b`).test(o);
      if (/\bprisma\s*\./.test(o) && !decl("prisma") && fs.existsSync(path.join(srcDir, "lib", "prisma.ts"))) miss.push('import { prisma } from "@/lib/prisma";');
      if (/\blogger\s*\./.test(o) && !decl("logger") && fs.existsSync(path.join(srcDir, "lib", "logger.ts"))) miss.push('import { logger } from "@/lib/logger";');
      if (miss.length) { o = miss.join(eol) + eol + o; notes.push("imports restaurados: " + miss.map((x) => x.match(/\{ (\w+) \}/)[1]).join(", ")); }
    }
    if (o !== orig) { stage(file, o, notes.join("; ")); n++; P(`  ${rel(file)}: ${notes.join("; ")}`); }
  }
  if (!n) P("  nada a corrigir");
  if (fs.existsSync(helperNoExt + ".ts") && !files.some((f) => f !== helperNoExt + ".ts" && [...cur(f).matchAll(HELPER_RE)].some((m) => resolvesToHelper(f, m[3])))) P("  (src/modules/whatsapp/baileys.ts nao e mais usado; pode apagar)");
}

// ---- Sticker (opcional)
if (STICKER) {
  P("\n=== 2b. wa-sticker-formatter (--sticker) ===");
  let n2 = 0;
  for (const f of files) {
    const t = cur(f); if (!t || !t.includes("wa-sticker-formatter")) continue;
    const o = t.replace(/import\s+Sticker\s+from\s+(["'])wa-sticker-formatter\1/, 'import { Sticker } from "wa-sticker-formatter"');
    if (o !== t) { stage(f, o, "Sticker -> import nomeado"); P(`  ${rel(f)}: Sticker -> import nomeado`); n2++; }
  }
  if (!n2) P("  nada a corrigir");
}

// =====================================================================  3. CRON / FUSO
P("\n=== 3. CRON E FUSO HORARIO ===");
const cronF = path.join(srcDir, "lib", "cron.ts"), idxF = path.join(srcDir, "server", "index.ts"), schedF = path.join(srcDir, "modules", "whatsapp", "scheduler.ts");
const cronS = cur(cronF), idxS = cur(idxF);
if (cronS && /tz:\s*["']Asia\/Jakarta["']/.test(cronS) && !cronS.includes("getTimezone")) {
  if ((cronS.match(/const now = new Date\(\);/g) || []).length === 1 && /export function initScheduler/.test(cronS)) {
    let s = cronS.replace(/\{\s*tz:\s*["']Asia\/Jakarta["']\s*\}/g, "{ tz }");
    s = s.replace(/(const now = new Date\(\);[ \t]*(\r?\n))/, `$1            const tz = await getTimezone();$2`);
    s = s.replace(/export function initScheduler/, `async function getTimezone(): Promise<string> {\n    try {\n        const cfg = await prisma.systemConfig.findUnique({ where: { id: "default" } });\n        return cfg?.timezone || process.env.TZ || "America/Sao_Paulo";\n    } catch {\n        return process.env.TZ || "America/Sao_Paulo";\n    }\n}\n\nexport function initScheduler`);
    stage(cronF, s, "cron.ts: fuso fixo Asia/Jakarta -> fuso do sistema"); P("  src/lib/cron.ts: fuso fixo de Jacarta substituido pelo fuso do sistema");
  } else manual.push('src/lib/cron.ts tem estrutura diferente do esperado: troque { tz: "Asia/Jakarta" } pelo fuso do sistema manualmente.');
} else P("  cron.ts: ok");
if (idxS && /^[ \t]*import\(["'][^"']*whatsapp\/scheduler["']\)\.then\([^\n]*startScheduler/m.test(idxS)) {
  stage(idxF, idxS.replace(/^([ \t]*)(import\(["'][^"']*whatsapp\/scheduler["']\)\.then\([^\n]*)$/m, (_, i, l) => `${i}// [corrigir-tudo] desativado: duplicava o cron.ts e procurava a sessao pelo id errado\n${i}// ${l}`), "scheduler.ts duplicado desativado");
  P("  src/server/index.ts: scheduler.ts duplicado desativado");
} else if (fs.existsSync(schedF)) P("  scheduler.ts duplicado: ja desativado"); 
for (const f of files) {
  let t = cur(f); if (!/Asia\/Jakarta/.test(t)) continue;
  const client = /^\s*["']use client["']/.test(t);
  let o = t;
  o = o.replace(/(\w+\??\.timezone)\s*\|\|\s*["']Asia\/Jakarta["']/g, client ? '$1 || "America/Sao_Paulo"' : '$1 || process.env.TZ || "America/Sao_Paulo"');
  if (client) {
    o = o.replace(/useState(<string>)?\(\s*["']Asia\/Jakarta["']\s*\)/g, 'useState$1("America/Sao_Paulo")');
    o = o.replace(/(\btimezone:\s*)["']Asia\/Jakarta["'](\s*,)/g, '$1"America/Sao_Paulo"$2');
  }
  if (o !== t) { stage(f, o, 'fuso padrao "Asia/Jakarta" -> America/Sao_Paulo'); P(`  ${rel(f)}: fuso padrao ajustado`); }
}
// banco
let prisma = null;
if (!NODB) { try { const { PrismaClient } = req("@prisma/client"); for (const f of [".env"]) { const t = rd(path.join(root, f)); if (t) for (const l of t.split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } prisma = new PrismaClient({ log: [] }); await prisma.$connect(); } catch (e) { P("  banco: sem conexao (" + String(e.message).split("\n").filter(Boolean).slice(-1)[0].slice(0, 120) + ")"); prisma = null; } }
if (prisma) {
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { id: "default" } }); const old = cfg?.timezone || "Asia/Jakarta";
    if (old !== targetTz) { if (!DRY) await prisma.systemConfig.upsert({ where: { id: "default" }, update: { timezone: targetTz }, create: { id: "default", timezone: targetTz } }); P(`  banco: SystemConfig.timezone ${old} -> ${targetTz}${DRY ? " (simulado)" : ""}`);
      const np = await prisma.scheduledMessage.count({ where: { status: "PENDING" } }); if (np) warnings.push(`${np} mensagem(ns) agendada(s) PENDING ja existia(m) com o fuso antigo (${old}). Se os horarios foram pensados em ${targetTz}, use: node cron-doctor.mjs --fix --shift-pending (ou reagende).`);
    } else P(`  banco: fuso ja esta em ${targetTz}`);
    const pend = await prisma.scheduledMessage.count({ where: { status: "PENDING" } }); P(`  mensagens agendadas PENDING: ${pend}`);
  } catch (e) { P("  banco: nao consegui ajustar (" + String(e.message).split("\n").filter(Boolean).slice(-1)[0].slice(0, 120) + ")"); }
  await prisma.$disconnect();
}

// =====================================================================  GRAVAR
P("\n=== 4. GRAVANDO ===");
let changed = 0;
for (const [f, e] of staged) {
  if (e.text === e.orig) continue; changed++;
  if (DRY) { P(`  [dry] ${rel(f)}`); continue; }
  const dest = path.join(backupDir, path.relative(root, f)); fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, e.orig); fs.writeFileSync(f, e.text); P(`  OK  ${rel(f)}`);
}
if (!changed) P("  nenhum arquivo precisou mudar");
else if (!DRY) P(`  Originais em ${path.relative(root, backupDir)}/`);

// =====================================================================  VERIFICACAO
P("\n=== 5. VERIFICACAO ===");
let ts = null; try { ts = req("typescript"); } catch {}
const problems = [];
if (!ts) P("  typescript nao instalado: verificacao pulada (rode npm install).");
else {
  const aliases = []; let baseDir = root;
  const tsc = path.join(root, "tsconfig.json");
  if (fs.existsSync(tsc)) { const cfg = ts.readConfigFile(tsc, ts.sys.readFile).config?.compilerOptions || {}; if (cfg.baseUrl) baseDir = path.resolve(root, cfg.baseUrl); for (const [k, v] of Object.entries(cfg.paths || {})) aliases.push({ prefix: k.replace(/\*$/, ""), targets: v.map((x) => x.replace(/\*$/, "")) }); }
  const EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".css", "/index.ts", "/index.tsx", "/index.js"];
  const exists = (b) => EXTS.some((e) => { const p = b + e; return fs.existsSync(p) && fs.statSync(p).isFile(); });
  const bi = new Set(builtinModules);
  const checkMod = (file, spec, line) => {
    if (spec.startsWith("node:") || bi.has(spec.split("/")[0])) return;
    if (spec.startsWith(".")) { if (!exists(path.resolve(path.dirname(file), spec))) problems.push(`${rel(file)}:${line} import quebrado "${spec}"`); return; }
    const al = aliases.find((a) => a.prefix && spec.startsWith(a.prefix));
    if (al) { const r = spec.slice(al.prefix.length); if (!al.targets.some((t) => exists(path.resolve(baseDir, t + r)))) problems.push(`${rel(file)}:${line} alias nao resolve "${spec}"`); return; }
    const nm = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
    if (!fs.existsSync(path.join(root, "node_modules", nm))) problems.push(`${rel(file)}:${line} pacote "${nm}" nao instalado (npm install ${nm})`);
  };
  const bind = (n, acc) => { if (ts.isIdentifier(n)) acc.push(n); else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) n.elements.forEach((e) => { if (!ts.isOmittedExpression(e)) bind(e.name, acc); }); };
  for (const file of walk(srcDir)) {
    const text = cur(file); if (text === null) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const L = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    const decl = new Map(); const reg = (id, kind) => { if (!decl.has(id.text)) decl.set(id.text, []); decl.get(id.text).push({ kind, line: L(id) }); };
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
        checkMod(file, st.moduleSpecifier.text, L(st)); const c = st.importClause; if (!c) continue;
        if (c.name) reg(c.name, "import");
        if (c.namedBindings) { if (ts.isNamespaceImport(c.namedBindings)) reg(c.namedBindings.name, "import"); else c.namedBindings.elements.forEach((e) => reg(e.name, "import")); }
      } else if (ts.isExportDeclaration(st) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) checkMod(file, st.moduleSpecifier.text, L(st));
      else if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach((d) => { const a = []; bind(d.name, a); a.forEach((i) => reg(i, "var")); });
      else if (ts.isFunctionDeclaration(st) && st.name) reg(st.name, "function");
      else if (ts.isClassDeclaration(st) && st.name) reg(st.name, "class");
      else if (ts.isEnumDeclaration(st)) reg(st.name, "enum");
      else if (ts.isInterfaceDeclaration(st)) reg(st.name, "interface");
      else if (ts.isTypeAliasDeclaration(st)) reg(st.name, "type");
    }
    for (const [name, arr] of decl) {
      if (arr.length < 2) continue; const kinds = new Set(arr.map((a) => a.kind)); const sub = (s) => [...kinds].every((k) => s.has(k));
      if (kinds.has("import") && [...kinds].every((k) => k === "import" || k === "interface" || k === "type") && arr.filter((a) => a.kind === "import").length === 1) continue;
      if (sub(new Set(["interface"])) || sub(new Set(["function"])) || sub(new Set(["class", "interface"]))) continue;
      problems.push(`${rel(file)}:${arr[1].line} "${name}" definido mais de uma vez (linhas ${arr.map((a) => a.line).join(", ")})`);
    }
    const used = []; (function w(n) { if (ts.isIdentifier(n) && n.text === "baileys") { const p = n.parent; const dn = (ts.isImportClause(p) || ts.isImportSpecifier(p) || ts.isNamespaceImport(p) || ts.isVariableDeclaration(p)) && p.name === n; const pr = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n); if (!dn && !pr) used.push(L(n)); } ts.forEachChild(n, w); })(sf);
    if (used.length && !decl.has("baileys")) problems.push(`${rel(file)}:${used[0]} "baileys" usado mas nao declarado`);
  }
  P(`  analise estatica: ${problems.length ? problems.length + " problema(s)" : "nenhum problema"}`);
  problems.slice(0, 40).forEach((p) => P("   - " + p));
  if (!NOTSC && !DRY) {
    P("  rodando tsc --noEmit (pode levar alguns minutos)...");
    const r = spawnSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", "tsconfig.json", "--pretty", "false"], { cwd: root, encoding: "utf8", timeout: 900000, maxBuffer: 256 * 1024 * 1024 });
    const errs = ((r.stdout || "") + (r.stderr || "")).split(/\r?\n/).filter((l) => /\): error TS\d+:/.test(l));
    P(`  tsc: ${errs.length} erro(s) de tipo`); errs.slice(0, 25).forEach((l) => P("   - " + l.replace(/\\/g, "/").slice(0, 230)));
    if (errs.length > 25) P(`   ... e mais ${errs.length - 25}`);
  } else if (DRY) P("  (tsc nao roda no --dry)");
}

// =====================================================================  RESUMO
P("\n=============================== RESUMO ===============================");
P(`${DRY ? "[SIMULACAO] " : ""}Arquivos alterados: ${changed}`);
warnings.forEach((w) => P("[ATENCAO] " + w));
manual.forEach((m) => P("[MANUAL]  " + m));
if (!DRY) P("\nProximo passo: pare o servidor (Ctrl+C) e rode  npm run dev");
else P("\nPara aplicar de verdade, rode sem --dry:  node corrigir-tudo.mjs");
fs.writeFileSync(path.join(root, "corrigir-tudo-relatorio.txt"), out.join("\n") + "\n");
console.log("\nRelatorio: corrigir-tudo-relatorio.txt");
