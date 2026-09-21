import { afterEach, describe, expect, it } from "vitest"

import { decryptSecret, encryptSecret } from "@/lib/crypto/secret"

describe("secret encryption", () => {
  afterEach(() => {
    delete process.env.TRACKY_ENCRYPTION_KEY
    delete process.env.TRACK_ENCRYPTION_KEY
  })

  it("round-trips a secret", () => {
    process.env.TRACKY_ENCRYPTION_KEY = "test-tracky-key"
    const encrypted = encryptSecret("sk-test-1234")
    expect(decryptSecret(encrypted.ciphertext, encrypted.iv)).toBe("sk-test-1234")
  })

  it("falls back to TRACK_ENCRYPTION_KEY", () => {
    process.env.TRACK_ENCRYPTION_KEY = "test-track-key"
    const encrypted = encryptSecret("sk-test-1234")
    expect(decryptSecret(encrypted.ciphertext, encrypted.iv)).toBe("sk-test-1234")
  })
})
