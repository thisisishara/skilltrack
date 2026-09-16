import { expect, test } from "@playwright/test"

const e2eSecret = process.env.E2E_SECRET

test.describe("authenticated roadmap", () => {
  test.skip(!e2eSecret, "Set E2E_SECRET to run authenticated Playwright flows.")

  test.beforeEach(async ({ request }) => {
    const response = await request.post("/api/e2e/session", {
      headers: { "x-e2e-secret": e2eSecret ?? "" },
    })
    expect(response.ok()).toBeTruthy()
  })

  test("create role, node, checklist, and keep progress after reload", async ({
    page,
  }) => {
    const roleName = `E2E ${Date.now()}`
    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Create Role" }).click()
    await page.getByLabel("Name").fill(roleName)
    await page.getByRole("button", { name: "Create role" }).click()
    await expect(page.getByText("This roadmap is empty")).toBeVisible()

    await page.getByRole("button", { name: "Add first topic" }).click()
    await page.getByLabel("Title").fill("Retrieval")
    await page.getByRole("button", { name: "Add topic" }).click()
    await expect(page.getByText("Retrieval").first()).toBeVisible()

    await page.getByText("Retrieval").first().click()
    await page.getByRole("button", { name: "Add task" }).click()
    await page.getByPlaceholder("Understand CAP theorem").fill("Read docs")
    await page.getByRole("button", { name: "Add task" }).click()
    await page.getByPlaceholder("Understand CAP theorem").fill("Write notes")
    await page.getByRole("button", { name: "Add task" }).click()

    await page.getByRole("checkbox").first().click()
    await expect(page.getByText("50%").first()).toBeVisible()

    await page.reload()
    await page.getByText("Retrieval").first().click()
    await expect(page.getByText("50%").first()).toBeVisible()
  })

  test("import JSON preserves hierarchy and checklist progress", async ({
    page,
  }) => {
    const json = {
      schema: "skilltrack.roadmap.v1",
      roadmap: { name: `E2E import ${Date.now()}` },
      nodes: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          title: "Root",
          checklist: [
            {
              id: "10000000-0000-4000-8000-000000000001",
              title: "Done item",
              completed: true,
            },
            {
              id: "10000000-0000-4000-8000-000000000002",
              title: "Open item",
              completed: false,
            },
          ],
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          title: "Child",
          parent_id: "00000000-0000-4000-8000-000000000001",
        },
      ],
    }

    await page.goto("/dashboard")
    await page.getByRole("button", { name: "Create Role" }).click()
    await page.getByText("Import JSON").click()
    await page.getByPlaceholder(/skilltrack.roadmap.v1/).fill(JSON.stringify(json))
    await page.getByRole("button", { name: "Import role" }).click()

    await expect(page.getByText("Root").first()).toBeVisible()
    await expect(page.getByText("Child").first()).toBeVisible()
    await page.getByText("Root").first().click()
    await expect(page.getByText("50%").first()).toBeVisible()
    await expect(page.getByText("Done item")).toBeVisible()
  })
})
