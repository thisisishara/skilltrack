import { expect, test } from "@playwright/test"

test("login page offers GitHub sign-in", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByText("SkillTrack").first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Continue with GitHub" })
  ).toBeVisible()
})
