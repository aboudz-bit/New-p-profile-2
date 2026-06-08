/**
 * P Profile ID — the permanent primary identity for every Product Profile.
 *
 * Always minted on profile creation, independent of whether a serial number
 * exists (serial is only a secondary verification attribute). The ID backs the
 * QR code; the public QR scan resolves `pProfileId` → a safe public preview.
 *
 * Format:  PP-XXXXXXXXXX  (Crockford base32, ambiguous chars removed)
 */
import { randomBytes } from "node:crypto";

// Crockford base32 alphabet (no I, L, O, U to avoid visual ambiguity).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ID_LENGTH = 10;

export function generatePProfileId(): string {
  const bytes = randomBytes(ID_LENGTH);
  let out = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `PP-${out}`;
}

const PPID_RE = /^PP-[0-9A-HJKMNP-TV-Z]{10}$/;

/** Validate the shape of a P Profile ID (used by the public lookup endpoint). */
export function isValidPProfileId(value: string): boolean {
  return PPID_RE.test(value);
}
