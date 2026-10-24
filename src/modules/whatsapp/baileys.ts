import * as NS from "@whiskeysockets/baileys";

type Baileys = typeof import("@whiskeysockets/baileys");

// Funciona tanto no Node ESM (tsx) quanto no bundler do Next
const B: any = (NS as any).BufferJSON ? NS : (NS as any).default;

export const makeWASocket = B.default as Baileys["default"];
export const BufferJSON = B.BufferJSON as Baileys["BufferJSON"];
export const initAuthCreds = B.initAuthCreds as Baileys["initAuthCreds"];
export const proto = B.proto as Baileys["proto"];
export const DisconnectReason = B.DisconnectReason as Baileys["DisconnectReason"];
export const fetchLatestBaileysVersion = B.fetchLatestBaileysVersion as Baileys["fetchLatestBaileysVersion"];
export const Browsers = B.Browsers as Baileys["Browsers"];
// Se algum arquivo usar outro valor do Baileys (ex.: downloadMediaMessage,
// jidNormalizedUser, delay...), adicione aqui no mesmo formato.