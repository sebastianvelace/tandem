import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

/*
 * Cifrado simétrico de tokens OAuth at rest (SEC-06). AES-256-GCM.
 * Formato del blob (bytea): iv(12) || authTag(16) || ciphertext.
 * TOKEN_ENC_KEY: 32 bytes en hex (64 chars) o base64.
 */
function key(): Buffer {
  let raw = env.tokenEncKey;
  // Tolera prefijos explícitos del formato (ver .env.example).
  let encoding: BufferEncoding = "base64";
  if (raw.startsWith("hex:")) {
    raw = raw.slice(4);
    encoding = "hex";
  } else if (raw.startsWith("base64:")) {
    raw = raw.slice(7);
  } else if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    encoding = "hex";
  }
  const buf = Buffer.from(raw, encoding);
  if (buf.length !== 32) {
    throw new Error("TOKEN_ENC_KEY debe ser de 32 bytes (hex de 64 chars o base64)");
  }
  return buf;
}

export function encryptToken(plaintext: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptToken(blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const data = blob.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
