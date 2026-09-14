"use client"

import { createElement } from "react"
import type { LucideIcon, LucideProps } from "lucide-react"
import {
  Book,
  Bot,
  Box,
  Brain,
  ChartColumn,
  CircleDot,
  Cloud,
  Code,
  Cpu,
  Database,
  FileCode,
  FlaskConical,
  GitBranch,
  Globe,
  Key,
  Layers,
  Link,
  ListChecks,
  Lock,
  Map,
  MessageSquare,
  Network,
  Puzzle,
  Search,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Workflow,
  Zap,
} from "lucide-react"

import { DEFAULT_NODE_ICON } from "@/domain/nodes/icon"

const ICONS = {
  "circle-dot": CircleDot,
  brain: Brain,
  code: Code,
  database: Database,
  cloud: Cloud,
  shield: Shield,
  network: Network,
  bot: Bot,
  search: Search,
  book: Book,
  server: Server,
  terminal: Terminal,
  "flask-conical": FlaskConical,
  "chart-column": ChartColumn,
  users: Users,
  lock: Lock,
  box: Box,
  layers: Layers,
  "git-branch": GitBranch,
  cpu: Cpu,
  globe: Globe,
  "file-code": FileCode,
  sparkles: Sparkles,
  workflow: Workflow,
  puzzle: Puzzle,
  key: Key,
  "message-square": MessageSquare,
  "list-checks": ListChecks,
  link: Link,
  map: Map,
  zap: Zap,
} as const satisfies Record<string, LucideIcon>

export const FEATURED_NODE_ICONS = Object.keys(ICONS)

export const iconNames = FEATURED_NODE_ICONS

export function resolveLucideIcon(name: string): LucideIcon {
  return ICONS[name as keyof typeof ICONS] ?? ICONS[DEFAULT_NODE_ICON]
}

export function NodeLucideIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  // resolveLucideIcon always returns one of the static imports above, so the
  // component identity is stable for a given name; createElement sidesteps
  // the (false-positive) "component created during render" lint heuristic.
  return createElement(resolveLucideIcon(name), props)
}
