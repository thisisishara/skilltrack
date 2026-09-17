export type Link = {
  id: string
  roleId: string
  topicId: string | null
  label: string
  url: string
  createdAt: string
  updatedAt: string
}

/** @deprecated Use Link */
export type NodeLink = Link
