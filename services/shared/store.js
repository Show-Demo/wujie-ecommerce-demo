import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initialState } from "./data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, "demo-db.json");

function ensureDbFile() {
  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2));
    return;
  }
  try {
    const raw = fs.readFileSync(dbFile, "utf8").trim();
    if (!raw || raw === "{}") {
      fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2));
    }
  } catch {
    fs.writeFileSync(dbFile, JSON.stringify(initialState, null, 2));
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function readState() {
  ensureDbFile();
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

export function writeState(nextState) {
  fs.writeFileSync(dbFile, JSON.stringify(nextState, null, 2));
}

export function updateState(updater) {
  const state = readState();
  const nextState = updater(clone(state)) ?? state;
  writeState(nextState);
  return clone(nextState);
}

export function resetState() {
  writeState(clone(initialState));
  return clone(initialState);
}

ensureDbFile();
