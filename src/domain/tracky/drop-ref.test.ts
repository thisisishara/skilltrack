import { describe, expect, it } from "vitest"

import {
  parseTrackyDropRef,
  TRACKY_REF_TEXT_PREFIX,
  upsertTrackRef,
  type TrackyDropRef,
} from "@/domain/tracky/drop-ref"

const topic: TrackyDropRef = {
  kind: "topic",
  id: "t1",
  title: "Python",
  path: ["Fundamentals", "Python"],
  topicId: "t1",
  topicTitle: "Python",
}

const task: TrackyDropRef = {
  kind: "task",
  id: "k1",
  title: "Test",
  path: ["Fundamentals", "Python", "Test"],
  topicId: "t1",
  topicTitle: "Python",
}

describe("parseTrackyDropRef", () => {
  it("parses prefixed plaintext payloads", () => {
    expect(parseTrackyDropRef(`${TRACKY_REF_TEXT_PREFIX}${JSON.stringify(topic)}`)).toEqual(
      topic
    )
  })

  it("rejects random text", () => {
    expect(parseTrackyDropRef("topic-1")).toBeNull()
  })
})

describe("upsertTrackRef", () => {
  it("moves a duplicate to the front and caps the list", () => {
    const next = upsertTrackRef([topic], task)
    expect(next.map((item) => item.id)).toEqual(["k1", "t1"])
    expect(upsertTrackRef(next, topic).map((item) => item.id)).toEqual(["t1", "k1"])
  })
})
