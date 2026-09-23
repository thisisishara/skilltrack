export type NormalizedTask = {
  id: string
  title: string
  description: string | null
  completed: boolean
}

export type NormalizedLink = {
  id: string
  label: string
  url: string
}

export type NormalizedTopicNote = {
  id: string
  title: string
  body: string
}

export type NormalizedTopic = {
  id: string
  parentId: string | null
  title: string
  description: string | null
  notes: NormalizedTopicNote[]
  icon: string
  color: string | null
  tasks: NormalizedTask[]
  links: NormalizedLink[]
}

export type NormalizedRoadmapDocument = {
  name: string
  description: string | null
  notes: string | null
  links: NormalizedLink[]
  topics: NormalizedTopic[]
}

/** @deprecated Use NormalizedTopic */
export type NormalizedRoadmapNode = NormalizedTopic
/** @deprecated Use NormalizedTask */
export type NormalizedChecklistItem = NormalizedTask
