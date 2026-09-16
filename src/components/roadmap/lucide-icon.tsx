"use client"

import { createElement, type SVGProps } from "react"
import type { LucideIcon, LucideProps } from "lucide-react"
import type { SimpleIcon } from "simple-icons"
import {
  Activity,
  Atom,
  AudioLines,
  Binary,
  Blocks,
  Book,
  BookOpen,
  Bot,
  BotMessageSquare,
  Box,
  Boxes,
  Brain,
  BrainCircuit,
  Bug,
  ChartColumn,
  CircleDot,
  CircuitBoard,
  Cloud,
  Code,
  CodeXml,
  Container,
  Cpu,
  Database,
  Dna,
  Earth,
  FileCode,
  FileJson,
  FlaskConical,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Globe,
  GraduationCap,
  HardDrive,
  Key,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Link,
  ListChecks,
  Lock,
  Map as LucideMap,
  MessageSquare,
  Microchip,
  Network,
  Package,
  Puzzle,
  Rocket,
  Search,
  Server,
  Shield,
  Sparkles,
  SquareTerminal,
  Target,
  Terminal,
  TestTube,
  Users,
  WandSparkles,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react"

import {
  BRAND_ICONS,
  FEATURED_BRAND_ICONS,
} from "@/components/roadmap/brand-icons"
import { DEFAULT_NODE_ICON } from "@/domain/nodes/icon"

const LUCIDE_ICONS = {
  "circle-dot": CircleDot,
  brain: Brain,
  "brain-circuit": BrainCircuit,
  bot: Bot,
  "bot-message-square": BotMessageSquare,
  sparkles: Sparkles,
  "wand-sparkles": WandSparkles,
  cpu: Cpu,
  microchip: Microchip,
  "circuit-board": CircuitBoard,
  binary: Binary,
  code: Code,
  "code-xml": CodeXml,
  "file-code": FileCode,
  "file-json": FileJson,
  terminal: Terminal,
  "square-terminal": SquareTerminal,
  container: Container,
  boxes: Boxes,
  box: Box,
  package: Package,
  layers: Layers,
  blocks: Blocks,
  cloud: Cloud,
  database: Database,
  server: Server,
  "hard-drive": HardDrive,
  "git-branch": GitBranch,
  "git-merge": GitMerge,
  "git-pull-request": GitPullRequest,
  workflow: Workflow,
  network: Network,
  globe: Globe,
  earth: Earth,
  shield: Shield,
  lock: Lock,
  key: Key,
  rocket: Rocket,
  atom: Atom,
  "flask-conical": FlaskConical,
  "test-tube": TestTube,
  bug: Bug,
  search: Search,
  book: Book,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  lightbulb: Lightbulb,
  target: Target,
  map: LucideMap,
  users: Users,
  "message-square": MessageSquare,
  "list-checks": ListChecks,
  puzzle: Puzzle,
  zap: Zap,
  "chart-column": ChartColumn,
  "layout-dashboard": LayoutDashboard,
  webhook: Webhook,
  dna: Dna,
  "audio-lines": AudioLines,
  activity: Activity,
  link: Link,
} as const satisfies Record<string, LucideIcon>

const LUCIDE_ALIASES: Record<keyof typeof LUCIDE_ICONS, string[]> = {
  "circle-dot": ["default"],
  brain: ["ai", "ml", "thinking"],
  "brain-circuit": ["ai", "neural", "ml"],
  bot: ["ai", "robot", "agent"],
  "bot-message-square": ["ai", "chatbot", "llm"],
  sparkles: ["ai", "magic"],
  "wand-sparkles": ["ai", "generate"],
  cpu: ["processor", "compute"],
  microchip: ["chip", "hardware", "ai"],
  "circuit-board": ["electronics", "pcb"],
  binary: ["bits", "low-level"],
  code: ["programming", "dev"],
  "code-xml": ["html", "markup"],
  "file-code": ["source"],
  "file-json": ["json"],
  terminal: ["cli", "shell"],
  "square-terminal": ["cli", "console"],
  container: ["docker", "oci"],
  boxes: ["modules", "packages"],
  box: ["module"],
  package: ["npm", "library"],
  layers: ["stack"],
  blocks: ["building blocks"],
  cloud: ["aws", "azure", "gcp", "saas"],
  database: ["sql", "storage", "db"],
  server: ["backend", "infra"],
  "hard-drive": ["disk", "storage"],
  "git-branch": ["git", "vcs"],
  "git-merge": ["git"],
  "git-pull-request": ["pr", "github", "gitlab"],
  workflow: ["pipeline", "ci"],
  network: ["distributed", "graph"],
  globe: ["web", "www"],
  earth: ["i18n", "world"],
  shield: ["security", "auth"],
  lock: ["privacy", "auth"],
  key: ["secrets", "api key"],
  rocket: ["launch", "deploy"],
  atom: ["science", "physics"],
  "flask-conical": ["lab", "experiment"],
  "test-tube": ["qa", "testing"],
  bug: ["debug", "issue"],
  search: ["find"],
  book: ["docs", "learn"],
  "book-open": ["reading", "docs"],
  "graduation-cap": ["course", "education"],
  lightbulb: ["idea"],
  target: ["goal", "okr"],
  map: ["roadmap"],
  users: ["team", "people"],
  "message-square": ["chat", "comms"],
  "list-checks": ["checklist", "todo"],
  puzzle: ["plugin", "extension"],
  zap: ["fast", "performance"],
  "chart-column": ["analytics", "metrics"],
  "layout-dashboard": ["ui", "admin"],
  webhook: ["http", "callback"],
  dna: ["bio", "genetics"],
  "audio-lines": ["speech", "voice", "audio"],
  activity: ["health", "monitoring"],
  link: ["url"],
}

function titleFromId(id: string) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export type NodeIconInfo = {
  id: string
  title: string
  aliases: string[]
  group: "suggested" | "brand"
}

const LUCIDE_INFOS: NodeIconInfo[] = Object.keys(LUCIDE_ICONS).map((id) => ({
  id,
  title: titleFromId(id),
  aliases: LUCIDE_ALIASES[id as keyof typeof LUCIDE_ALIASES],
  group: "suggested" as const,
}))

const BRAND_INFOS: NodeIconInfo[] = Object.entries(BRAND_ICONS).map(([id, def]) => ({
  id,
  title: def.title,
  aliases: [...def.aliases],
  group: "brand" as const,
}))

const ICON_INFO_BY_ID = new Map<string, NodeIconInfo>(
  [...LUCIDE_INFOS, ...BRAND_INFOS].map((info) => [info.id, info]),
)

export const FEATURED_NODE_ICONS: string[] = [
  "circle-dot",
  "brain",
  "brain-circuit",
  "bot",
  "bot-message-square",
  "sparkles",
  "cpu",
  "code",
  "container",
  "cloud",
  "database",
  "server",
  "git-branch",
  "shield",
  "rocket",
  "flask-conical",
  "book",
  "users",
  "zap",
  "network",
  "terminal",
  ...FEATURED_BRAND_ICONS,
]

export const iconNames = [...LUCIDE_INFOS, ...BRAND_INFOS].map((info) => info.id)

export function getNodeIconInfo(id: string): NodeIconInfo {
  return (
    ICON_INFO_BY_ID.get(id) ?? {
      id,
      title: id,
      aliases: [],
      group: "suggested",
    }
  )
}

export function nodeIconMatchesQuery(id: string, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }

  const info = getNodeIconInfo(id)
  const fields = [info.id, info.title.toLowerCase(), ...info.aliases.map((alias) => alias.toLowerCase())]

  if (q.length <= 2) {
    return fields.some((field) => field === q || field.split(/[\s/.+-]+/).includes(q))
  }

  return fields.some((field) => field.includes(q))
}

function BrandMark({
  letters,
  size = 24,
  ...props
}: { letters: string; size?: number | string } & SVGProps<SVGSVGElement>) {
  const fontSize = letters.length > 2 ? 7.5 : 9
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="currentColor"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {letters}
      </text>
    </svg>
  )
}

function SimpleBrandIcon({
  icon,
  size = 24,
  ...props
}: { icon: SimpleIcon; size?: number | string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d={icon.path} />
    </svg>
  )
}

export function resolveLucideIcon(name: string): LucideIcon {
  return LUCIDE_ICONS[name as keyof typeof LUCIDE_ICONS] ?? LUCIDE_ICONS[DEFAULT_NODE_ICON]
}

export function NodeLucideIcon({
  name,
  size,
  className,
  color,
}: { name: string } & LucideProps) {
  const brand = BRAND_ICONS[name as keyof typeof BRAND_ICONS]
  if (brand) {
    const markProps = { size, className, color }
    if ("kind" in brand.icon) {
      return <BrandMark letters={brand.icon.letters} {...markProps} />
    }

    return <SimpleBrandIcon icon={brand.icon} {...markProps} />
  }

  // resolveLucideIcon always returns one of the static imports above, so the
  // component identity is stable for a given name; createElement sidesteps
  // the (false-positive) "component created during render" lint heuristic.
  return createElement(resolveLucideIcon(name), { size, className, color })
}
