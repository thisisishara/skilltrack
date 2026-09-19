import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"

export function isTrackEncryptionConfigured() {
  return Boolean(process.env.TRACK_ENCRYPTION_KEY?.trim())
}

function encryptionKey() {
  const secret = process.env.TRACK_ENCRYPTION_KEY?.trim()
  if (!secret) {
    throw new Error("Missing TRACK_ENCRYPTION_KEY")
  }
  return createHash("sha256").update(secret).digest()
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
  }
}

export function decryptSecret(ciphertext: string, iv: string) {
  const payload = Buffer.from(ciphertext, "base64")
  const tag = payload.subarray(payload.length - 16)
  const data = payload.subarray(0, payload.length - 16)
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(iv, "base64"))
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")
}

export function secretLast4(plain: string) {
  const trimmed = plain.trim()
  if (trimmed.length <= 4) {
    return trimmed
  }
  return trimmed.slice(-4)
}
