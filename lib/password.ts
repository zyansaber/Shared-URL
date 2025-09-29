// lib/password.ts
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// Pick algorithm via env; default to scrypt
const ALG = (process.env.PASSWORD_HASH_ALG || "scrypt").toLowerCase();

export async function hashPassword(password: string): Promise<string> {
  if (ALG === "bcrypt") {
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(password, 12); // cost 12 like your old script
  }

  // scrypt (default) -> "salt:hashHex"
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  if (!stored) return false;

  // scrypt format: "salt:hashHex"
  if (stored.includes(":")) {
    const [salt, hashHex] = stored.split(":");
    if (!salt || !hashHex) return false;
    const calc = scryptSync(password, salt, 64);
    const given = Buffer.from(hashHex, "hex");
    if (given.length !== calc.length) return false;
    return timingSafeEqual(calc, given);
  }

  // assume bcrypt (legacy or ALG=bcrypt)
  try {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(password, stored);
  } catch {
    return false;
  }
}
