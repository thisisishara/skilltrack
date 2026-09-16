import { describe, expect, it } from "vitest"

import { isBlockedLinkHostname, isPrivateIpAddress } from "@/domain/links/public-host"
import { pageTitleFromHtml } from "@/domain/links/title"
import { defaultLinkLabel, resolveLinkFields } from "@/domain/links/url"

describe("link labels", () => {
  it("defaults an empty label to the site hostname", () => {
    expect(defaultLinkLabel("https://www.example.com/docs")).toBe("example.com")
    expect(resolveLinkFields("", "https://www.example.com/docs")).toEqual({
      ok: true,
      label: "example.com",
      url: "https://www.example.com/docs",
    })
  })

  it("keeps a provided label", () => {
    expect(resolveLinkFields("  Docs  ", "https://example.com")).toEqual({
      ok: true,
      label: "Docs",
      url: "https://example.com",
    })
  })

  it("rejects a non-http URL", () => {
    expect(resolveLinkFields("Docs", "ftp://example.com").ok).toBe(false)
  })
})

describe("page titles", () => {
  it("prefers og:title over the document title", () => {
    expect(
      pageTitleFromHtml(
        `<html><head><title>Fallback</title><meta property="og:title" content="Open Graph &amp; Title" /></head></html>`
      )
    ).toBe("Open Graph & Title")
  })

  it("reads a plain title tag", () => {
    expect(pageTitleFromHtml("<html><title>  React docs  </title></html>")).toBe("React docs")
  })

  it("returns null when nothing usable is present", () => {
    expect(pageTitleFromHtml("<html><body>Hello</body></html>")).toBeNull()
  })
})

describe("public hosts", () => {
  it("blocks localhost and private addresses", () => {
    expect(isBlockedLinkHostname("localhost")).toBe(true)
    expect(isBlockedLinkHostname("127.0.0.1")).toBe(true)
    expect(isBlockedLinkHostname("10.0.0.4")).toBe(true)
    expect(isPrivateIpAddress("192.168.1.1")).toBe(true)
    expect(isBlockedLinkHostname("example.com")).toBe(false)
  })
})
