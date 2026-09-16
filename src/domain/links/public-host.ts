import { isIP } from "node:net"

function ipv4Parts(ip: string) {
  const parts = ip.split(".").map((part) => Number(part))
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null
  }

  return parts as [number, number, number, number]
}

export function isPrivateIpAddress(address: string) {
  const kind = isIP(address)
  if (kind === 4) {
    const parts = ipv4Parts(address)
    if (!parts) {
      return true
    }

    const [a, b] = parts
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }

  if (kind === 6) {
    const normalized = address.toLowerCase()
    if (normalized.startsWith("::ffff:")) {
      return isPrivateIpAddress(normalized.slice("::ffff:".length))
    }

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fe80:") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd")
    )
  }

  return true
}

export function isBlockedLinkHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "")
  if (!host) {
    return true
  }

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true
  }

  if (isIP(host)) {
    return isPrivateIpAddress(host)
  }

  return false
}
