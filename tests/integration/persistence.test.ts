import { randomUUID } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createClient } from "@supabase/supabase-js"

import { createChecklistItem } from "@/application/tasks/tasks-service"
import {
  exportRoadmap,
  importRoadmap,
} from "@/application/import-export/import-export-service"
import { createNode } from "@/application/topics/topics-service"
import {
  createEmptyRole,
  deleteRole,
  listRoles,
} from "@/application/roles/roles-service"
import { ensureApplicationUser } from "@/application/users/users-service"
import { isApplicationError } from "@/domain/errors"
import * as topicsRepository from "@/repositories/topics/topics-repository"
import mixedTree from "@/schemas/fixtures/mixed-tree.json"
import { hasLiveSupabase } from "./setup"

const describeDb = hasLiveSupabase() ? describe : describe.skip

describeDb("repository and service persistence", () => {
  const fixtures: { userId: string; roleIds: string[] }[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    for (const fixture of fixtures.splice(0)) {
      for (const roleId of fixture.roleIds) {
        await deleteRole(fixture.userId, roleId).catch(() => undefined)
      }
    }
  })

  async function seedUser() {
    const suffix = randomUUID().slice(0, 8)
    const user = await ensureApplicationUser({
      githubUserId: `e10-${suffix}`,
      githubUsername: `e10_${suffix}`,
      displayName: "E10",
      avatarUrl: null,
    })
    expect(user.role).toBe("user")
    expect(user.approvalStatus).toBe("pending")
    const fixture = { userId: user.id, roleIds: [] as string[] }
    fixtures.push(fixture)
    return { user, fixture }
  }

  it("persists a role, node, and checklist item", async () => {
    const { user, fixture } = await seedUser()
    const role = await createEmptyRole(user.id, `E10 persist ${randomUUID().slice(0, 8)}`)
    fixture.roleIds.push(role.id)

    const node = await createNode(user.id, {
      roleId: role.id,
      parentId: null,
      title: "Retrieval",
    })
    const item = await createChecklistItem(user.id, role.id, node.id, {
      title: "Read the paper",
    })

    expect(node.title).toBe("Retrieval")
    expect(item.title).toBe("Read the paper")
    expect(item.completed).toBe(false)
  })

  it("denies anon/client reads via RLS", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return
    }

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await client.from("roles").select("id")
    expect(data ?? []).toHaveLength(0)
  })

  it("round-trips an export of an imported roadmap", async () => {
    const { user, fixture } = await seedUser()
    const role = await importRoadmap(user.id, JSON.stringify(mixedTree), {
      nameOverride: `E10 import ${randomUUID().slice(0, 8)}`,
    })
    fixture.roleIds.push(role.id)

    const exported = await exportRoadmap(user.id, role.id)
    const again = await importRoadmap(user.id, exported.json, {
      nameOverride: `E10 reimport ${randomUUID().slice(0, 8)}`,
    })
    fixture.roleIds.push(again.id)

    const second = await exportRoadmap(user.id, again.id)
    const firstDoc = JSON.parse(exported.json) as { topics: { title: string }[] }
    const secondDoc = JSON.parse(second.json) as { topics: { title: string }[] }
    expect(secondDoc.topics.map((topic) => topic.title)).toEqual(
      firstDoc.topics.map((topic) => topic.title)
    )
  })

  it("does not leave a role when graph insert fails", async () => {
    const { user } = await seedUser()
    const name = `E10 rollback ${randomUUID().slice(0, 8)}`
    const spy = vi
      .spyOn(topicsRepository, "insertMany")
      .mockRejectedValueOnce(new Error("forced insert failure"))

    await expect(importRoadmap(user.id, JSON.stringify(mixedTree), { nameOverride: name })).rejects.toBeTruthy()
    spy.mockRestore()

    const roles = await listRoles(user.id)
    expect(roles.some((role) => role.name === name)).toBe(false)
  })

  it("rejects import onto a non-empty role without merging", async () => {
    const { user, fixture } = await seedUser()
    const role = await createEmptyRole(user.id, `E10 nonempty ${randomUUID().slice(0, 8)}`)
    fixture.roleIds.push(role.id)
    await createNode(user.id, { roleId: role.id, parentId: null, title: "Existing" })

    try {
      await importRoadmap(user.id, JSON.stringify(mixedTree), { roleId: role.id })
      throw new Error("expected import to fail")
    } catch (error) {
      expect(isApplicationError(error)).toBe(true)
      if (isApplicationError(error)) {
        expect(error.message).toContain("empty roadmap")
      }
    }

    const nodes = await topicsRepository.listByRoleId(role.id)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.title).toBe("Existing")
  })
})
