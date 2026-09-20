import { load, type CheerioAPI } from "cheerio"

const NOISE_SELECTORS = [
  "header",
  "footer",
  "nav",
  "script",
  "style",
  "noscript",
  ".nav",
  ".search-bar",
  ".sub-nav-cta",
  ".contextual-sign-in-modal",
  ".base-contextual-sign-in-modal",
  "#base-contextual-sign-in-modal",
  "[id$='-sign-in-modal']",
  ".guest-upsells",
  ".google-one-tap__module",
  ".windows-app-upsell",
  ".cta-modal",
  ".see-who-was-hired",
  ".find-a-referral",
  ".job-alert-redirect-section__wrapper",
  "section.similar-jobs",
  "section.people-also-viewed",
  ".right-rail",
  ".pre-footer",
  ".related-jserps",
  ".tw-linkster",
  "footer.li-footer",
  ".show-more-less-html__button",
  ".show-more-less-button",
]

export function looksLikeHtml(input: string) {
  return /<[a-z][\s\S]*>/i.test(input)
}

export function loadJobDocument(html: string): CheerioAPI {
  return load(html)
}

export function sanitizeLinkedInHtml(html: string) {
  const $ = load(html)
  for (const selector of NOISE_SELECTORS) {
    $(selector).remove()
  }

  const details =
    $("main#main-content section.core-rail .details").first().html() ??
    $(".top-card-layout").parent().html() ??
    $(".decorated-job-posting__details").html()

  if (details?.trim()) {
    return details
  }

  const markup = $(".show-more-less-html__markup").first().html()
  return markup?.trim() ? markup : $.root().html() ?? html
}

export function extractJobBodyHtml($: CheerioAPI) {
  const markup = $(".show-more-less-html__markup").first()
  if (markup.length) {
    markup.find(".show-more-less-html__button, .show-more-less-button").remove()
    return markup.html()?.trim() || null
  }
  return null
}
