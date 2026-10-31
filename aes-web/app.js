"use strict";

// AES-256-CBC, same behaviour as encode-decode.com / PHP openssl_encrypt without an IV:
// key = secret (UTF-8) zero-padded or cut to 32 bytes, IV = 16 zero bytes, PKCS#7, base64 out.

const IV = new Uint8Array(16);
const utf8 = new TextEncoder();
const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

function importKey(secret) {
  const raw = new Uint8Array(32);
  raw.set(utf8.encode(secret).subarray(0, 32));
  return crypto.subtle.importKey("raw", raw, { name: "AES-CBC" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromBase64(text) {
  const s = atob(text.replace(/\s+/g, ""));
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function encrypt(input, secret) {
  const key = await importKey(secret);
  const ct = await crypto.subtle.encrypt({ name: "AES-CBC", iv: IV }, key, utf8.encode(input));
  return toBase64(new Uint8Array(ct));
}

async function decrypt(input, secret) {
  let bytes;
  try {
    bytes = fromBase64(input);
  } catch {
    throw new Error("The input isn’t valid base64.");
  }
  if (bytes.length === 0 || bytes.length % 16 !== 0) {
    throw new Error("The input isn’t an AES-256-CBC ciphertext. Its length must be a multiple of 16 bytes.");
  }
  const key = await importKey(secret);
  let pt;
  try {
    pt = await crypto.subtle.decrypt({ name: "AES-CBC", iv: IV }, key, bytes);
  } catch {
    throw new Error("Decryption failed. Check the secret and the input.");
  }
  try {
    return strictUtf8.decode(pt);
  } catch {
    throw new Error("Decryption failed. Check the secret and the input.");
  }
}

// --- UI ---

const $ = (id) => document.getElementById(id);
const secretEl = $("secret");
const inputEl = $("input");
const outputEl = $("output");
const statusEl = $("status");
const toggleBtn = $("toggle");
const copyBtn = $("copy");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

function wipe() {
  secretEl.value = "";
  inputEl.value = "";
  outputEl.value = "";
  secretEl.type = "password";
  toggleBtn.textContent = "Show";
  toggleBtn.setAttribute("aria-pressed", "false");
  copyBtn.textContent = "Copy";
  setStatus("");
}

async function run(mode) {
  const secret = secretEl.value;
  const input = mode === "decrypt" ? inputEl.value.trim() : inputEl.value;
  outputEl.value = "";
  if (!secret) return setStatus("Enter a secret.", true);
  if (!input) return setStatus("Enter some input.", true);
  try {
    outputEl.value = mode === "encrypt" ? await encrypt(input, secret) : await decrypt(input, secret);
    setStatus(mode === "encrypt" ? "Encrypted." : "Decrypted.");
  } catch (e) {
    setStatus(e.message, true);
  }
}

$("encrypt").addEventListener("click", () => run("encrypt"));
$("decrypt").addEventListener("click", () => run("decrypt"));
$("clear").addEventListener("click", wipe);

toggleBtn.addEventListener("click", () => {
  const show = secretEl.type === "password";
  secretEl.type = show ? "text" : "password";
  toggleBtn.textContent = show ? "Hide" : "Show";
  toggleBtn.setAttribute("aria-pressed", String(show));
});

copyBtn.addEventListener("click", async () => {
  if (!outputEl.value) return setStatus("Nothing to copy yet.", true);
  try {
    await navigator.clipboard.writeText(outputEl.value);
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
  } catch {
    setStatus("Couldn’t copy. Select the output and copy it by hand.", true);
  }
});

// Wipe fields whenever the page is shown or hidden. This covers normal loads,
// browsers that restore form values on refresh, and back/forward cache restores.
window.addEventListener("pageshow", wipe);
window.addEventListener("pagehide", wipe);
