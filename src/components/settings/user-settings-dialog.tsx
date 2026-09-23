"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  getPublicUserSettingsAction,
  resetTrackyConfigAction,
  saveTrackySettingsAction,
  setNotificationsEnabledAction,
} from "@/application/user-settings/actions"
import { defaultTrackyConfig } from "@/domain/user-settings/defaults"
import { TRACKY_TOOL_IDS, type TrackyConfig, type TrackyProvider, type TrackyToolId } from "@/domain/user-settings/types"
import { TRACKY_PROVIDER_OPTIONS, defaultModelForProvider, modelsForProvider } from "@/domain/user-settings/models"
import { useTrackyWorkspace } from "@/components/tracky/tracky-workspace"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { UsersSettingsPanel } from "@/components/settings/users-settings-panel"
import { ModelsSettingsPanel } from "@/components/settings/models-settings-panel"
import { ResetTrackyDefaultsAlert } from "@/components/settings/reset-tracky-defaults-alert"
import { DEFAULT_TRACKY_SYSTEM_PROMPT, defaultGenerationPrompt } from "@/application/tracky/prompts"

const TOOL_GROUPS: {
  id: string
  title: string
  description: string
  tools: { id: TrackyToolId; label: string }[]
}[] = [
  {
    id: "browse",
    title: "Browse",
    description: "How Tracky walks the active roadmap.",
    tools: [
      { id: "list_roots", label: "Top-level topics" },
      { id: "list_children", label: "Nested topics" },
      { id: "search_topics", label: "Search by title" },
      { id: "get_path", label: "Path from root" },
      { id: "get_topic", label: "Topic details" },
      { id: "get_notes", label: "Notes" },
      { id: "get_tasks", label: "Tasks" },
      { id: "get_links", label: "Links" },
      { id: "get_role", label: "Role overview" },
    ],
  },
  {
    id: "topics",
    title: "Topics",
    description: "Propose topic changes. Nothing is saved until you accept.",
    tools: [
      { id: "propose_create_topic", label: "Create" },
      { id: "propose_update_topic", label: "Update" },
      { id: "propose_delete_topic", label: "Delete" },
    ],
  },
  {
    id: "notes",
    title: "Notes",
    description: "Topic notes, plus the roadmap overview note.",
    tools: [
      { id: "propose_create_notes", label: "Add" },
      { id: "propose_update_notes", label: "Edit" },
      { id: "propose_delete_notes", label: "Clear" },
      { id: "propose_update_role", label: "Roadmap" },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    description: "Evidence checklist items under a topic.",
    tools: [
      { id: "propose_create_task", label: "Create" },
      { id: "propose_update_task", label: "Update" },
      { id: "propose_delete_task", label: "Delete" },
    ],
  },
  {
    id: "links",
    title: "Links",
    description: "Links on a topic or the roadmap.",
    tools: [
      { id: "propose_create_link", label: "Create" },
      { id: "propose_update_link", label: "Update" },
      { id: "propose_delete_link", label: "Delete" },
    ],
  },
  {
    id: "generate",
    title: "Generate",
    description: "Only when the active roadmap is empty.",
    tools: [{ id: "propose_full_roadmap", label: "Full roadmap" }],
  },
]

const GROUPED_TOOL_IDS = new Set(TOOL_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id)))
const UNGROUPED_TOOLS = TRACKY_TOOL_IDS.filter((id) => !GROUPED_TOOL_IDS.has(id))

const TEXT_SAVE_DELAY_MS = 350
const API_KEY_SAVE_DELAY_MS = 600

type TrackyDraft = {
  enabled: boolean
  provider: TrackyProvider | ""
  model: string
  baseUrl: string
  apiKey: string
  clearApiKey: boolean
  config: TrackyConfig
}

export function UserSettingsDialog() {
  const {
    settingsOpen,
    setSettingsOpen,
    settingsTab,
    setSettingsTab,
    canManageUsers,
  } = useTrackyWorkspace()

  return (
    <Dialog form open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        className="flex h-[min(90dvh,40rem)] w-full flex-col gap-4 overflow-hidden sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>User settings</DialogTitle>
          <DialogDescription>
            Account preferences that apply across every role.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={settingsTab}
          onValueChange={(value) => {
            if (value === "general" || value === "tracky") {
              setSettingsTab(value)
              return
            }
            if (canManageUsers && (value === "models" || value === "users")) {
              setSettingsTab(value)
            }
          }}
          orientation="vertical"
          className="min-h-0 flex-1 gap-6 overflow-hidden data-vertical:flex-row"
        >
          <TabsList variant="line" className="w-40 shrink-0 self-start">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tracky">Tracky</TabsTrigger>
            {canManageUsers ? <TabsTrigger value="models">Models</TabsTrigger> : null}
            {canManageUsers ? <TabsTrigger value="users">Users</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="general" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            <FieldSet>
              <FieldLegend>Notifications</FieldLegend>
              <Field>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <FieldLabel htmlFor="notifications-enabled">
                      Roadmap notifications
                    </FieldLabel>
                    <FieldDescription>
                      Stale-roadmap reminders in the header bell.
                    </FieldDescription>
                  </div>
                  <RoadmapNotificationsSwitch />
                </div>
              </Field>
            </FieldSet>
          </TabsContent>
          <TabsContent value="tracky" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            <TrackySettingsForm />
          </TabsContent>
          {canManageUsers ? (
            <TabsContent value="models" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
              <ModelsSettingsPanel />
            </TabsContent>
          ) : null}
          {canManageUsers ? (
            <TabsContent value="users" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
              <UsersSettingsPanel />
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function RoadmapNotificationsSwitch() {
  const { settings, setSettings } = useTrackyWorkspace()
  const requestIdRef = useRef(0)
  const settingsRef = useRef(settings)
  // eslint-disable-next-line react-hooks/refs
  settingsRef.current = settings

  return (
    <Switch
      id="notifications-enabled"
      checked={settings.notificationsEnabled}
      onCheckedChange={(checked) => {
        const enabled = checked === true
        const requestId = ++requestIdRef.current
        const next = { ...settingsRef.current, notificationsEnabled: enabled }
        settingsRef.current = next
        setSettings(next)
        void setNotificationsEnabledAction(enabled).then(async (result) => {
          if (requestId !== requestIdRef.current) {
            return
          }
          if (result.ok) {
            settingsRef.current = result.settings
            setSettings(result.settings)
            return
          }
          toast.error(result.message)
          const latest = await getPublicUserSettingsAction()
          if (requestId !== requestIdRef.current) {
            return
          }
          if (latest.ok) {
            settingsRef.current = latest.settings
            setSettings(latest.settings)
          }
        })
      }}
    />
  )
}

function TrackySettingsForm() {
  const { settings, setSettings } = useTrackyWorkspace()
  const [enabled, setEnabled] = useState(settings.trackyEnabled)
  const [provider, setProvider] = useState<TrackyProvider | "">(
    settings.trackyProvider ?? ""
  )
  const [model, setModel] = useState(settings.trackyModel ?? "")
  const [baseUrl, setBaseUrl] = useState(settings.trackyBaseUrl ?? "")
  const [apiKey, setApiKey] = useState("")
  const [clearApiKey, setClearApiKey] = useState(false)
  const [config, setConfig] = useState<TrackyConfig>(settings.trackyConfig)
  const [resetOpen, setResetOpen] = useState(false)
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveGeneration = useRef(0)
  const saveChain = useRef(Promise.resolve())
  const mountedRef = useRef(true)
  const dirtyRef = useRef(false)
  const persistDraftRef = useRef<() => void>(() => undefined)
  const draftRef = useRef<TrackyDraft>({
    enabled,
    provider,
    model,
    baseUrl,
    apiKey,
    clearApiKey,
    config,
  })
  // eslint-disable-next-line react-hooks/refs
  draftRef.current = {
    enabled,
    provider,
    model,
    baseUrl,
    apiKey,
    clearApiKey,
    config,
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const hadTimer = Boolean(persistTimer.current)
      if (persistTimer.current) {
        clearTimeout(persistTimer.current)
        persistTimer.current = null
      }
      if (hadTimer || dirtyRef.current) {
        persistDraftRef.current()
      }
    }
  }, [])

  function applyDraft(patch: Partial<TrackyDraft>) {
    const next = { ...draftRef.current, ...patch }
    draftRef.current = next
    dirtyRef.current = true
    if (patch.enabled !== undefined) {
      setEnabled(patch.enabled)
    }
    if (patch.provider !== undefined) {
      setProvider(patch.provider)
    }
    if (patch.model !== undefined) {
      setModel(patch.model)
    }
    if (patch.baseUrl !== undefined) {
      setBaseUrl(patch.baseUrl)
    }
    if (patch.apiKey !== undefined) {
      setApiKey(patch.apiKey)
    }
    if (patch.clearApiKey !== undefined) {
      setClearApiKey(patch.clearApiKey)
    }
    if (patch.config !== undefined) {
      setConfig(patch.config)
    }
  }

  function persistDraft() {
    const generation = ++saveGeneration.current
    saveChain.current = saveChain.current.catch(() => undefined).then(async () => {
      if (generation !== saveGeneration.current) {
        return
      }
      const draft = draftRef.current
      const wantedEnabled = draft.enabled
      const result = await saveTrackySettingsAction({
        enabled: draft.enabled,
        provider: draft.provider || null,
        model:
          draft.model.trim() ||
          (draft.provider
            ? defaultModelForProvider(draft.provider, settings.extraModels)
            : null),
        baseUrl: draft.baseUrl.trim() || null,
        apiKey: draft.apiKey.trim() || null,
        clearApiKey: draft.clearApiKey,
        trackyConfig: draft.config,
      })
      if (!mountedRef.current || generation !== saveGeneration.current) {
        return
      }
      if (!result.ok) {
        toast.error(result.message)
        const latest = await getPublicUserSettingsAction()
        if (!mountedRef.current || generation !== saveGeneration.current) {
          return
        }
        if (latest.ok) {
          setSettings(latest.settings)
          applyDraft({ enabled: latest.settings.trackyEnabled })
        }
        return
      }
      setSettings(result.settings)
      dirtyRef.current = false
      applyDraft({
        enabled: result.settings.trackyEnabled,
        ...(draft.apiKey.trim() || draft.clearApiKey
          ? { apiKey: "", clearApiKey: false }
          : {}),
      })
      dirtyRef.current = generation !== saveGeneration.current
      if (wantedEnabled && !result.settings.trackyEnabled) {
        toast.error("Tracky stayed off. Add a valid provider, model, and API key.")
      }
    })
  }
  // eslint-disable-next-line react-hooks/refs
  persistDraftRef.current = persistDraft

  function persistNow(patch?: Partial<TrackyDraft>) {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    if (patch) {
      applyDraft(patch)
    }
    persistDraft()
  }

  function schedulePersist(patch: Partial<TrackyDraft>, delay = TEXT_SAVE_DELAY_MS) {
    applyDraft(patch)
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
    }
    persistTimer.current = setTimeout(() => {
      persistTimer.current = null
      persistDraft()
    }, delay)
  }

  function patchTools(ids: TrackyToolId[], enabled: boolean) {
    persistNow({
      config: {
        ...draftRef.current.config,
        tools: {
          ...draftRef.current.config.tools,
          ...Object.fromEntries(ids.map((id) => [id, enabled])),
        },
      },
    })
  }

  function patchContext(
    patch: Partial<TrackyConfig["context"]>,
    persist: "now" | "soon" = "now"
  ) {
    const nextConfig = {
      ...draftRef.current.config,
      context: { ...draftRef.current.config.context, ...patch },
    }
    if (persist === "soon") {
      schedulePersist({ config: nextConfig })
      return
    }
    persistNow({ config: nextConfig })
  }

  async function reset() {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current)
      persistTimer.current = null
    }
    saveGeneration.current += 1
    const result = await resetTrackyConfigAction()
    if (!result.ok) {
      toast.error(result.message)
      throw new Error(result.message)
    }
    setSettings(result.settings)
    applyDraft({ config: result.settings.trackyConfig ?? defaultTrackyConfig() })
    toast.success("Tracky defaults restored")
  }

  const extraModels = settings.extraModels
  const modelChoices = provider ? modelsForProvider(provider, extraModels) : []

  return (
    <div className="flex flex-col gap-8">
      {!settings.encryptionConfigured ? (
        <p className="text-sm text-muted-foreground">
          Tracky cannot store API keys until TRACKY_ENCRYPTION_KEY is set on the server.
        </p>
      ) : null}

      <FieldSet>
        <FieldLegend>Connection</FieldLegend>
        <Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <FieldLabel htmlFor="tracky-enabled">Enable Tracky</FieldLabel>
              <FieldDescription>
                Roadmap copilot for the active role. Needs a verified API key.
              </FieldDescription>
            </div>
            <Switch
              id="tracky-enabled"
              checked={enabled}
              onCheckedChange={(checked) => persistNow({ enabled: checked === true })}
            />
          </div>
        </Field>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="tracky-provider">Provider</FieldLabel>
            <Select
              value={provider || null}
              itemToStringLabel={(value) =>
                TRACKY_PROVIDER_OPTIONS.find((item) => item.id === value)?.label ?? ""
              }
              onValueChange={(value) => {
                if (
                  value === "anthropic" ||
                  value === "openai" ||
                  value === "google" ||
                  value === "openrouter"
                ) {
                  persistNow({
                    provider: value,
                    model: modelsForProvider(value, extraModels).includes(
                      draftRef.current.model
                    )
                      ? draftRef.current.model
                      : defaultModelForProvider(value, extraModels),
                  })
                }
              }}
            >
              <SelectTrigger id="tracky-provider" className="w-full">
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TRACKY_PROVIDER_OPTIONS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="tracky-model">Model</FieldLabel>
            <Select
              value={model || null}
              disabled={!provider}
              itemToStringLabel={(value) => value ?? ""}
              onValueChange={(value) => {
                if (typeof value === "string" && value) {
                  persistNow({ model: value })
                }
              }}
            >
              <SelectTrigger id="tracky-model" className="w-full">
                <SelectValue placeholder={provider ? "Choose a model" : "Choose a provider first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(provider
                    ? [
                        ...modelChoices,
                        ...(model && !modelChoices.includes(model) ? [model] : []),
                      ]
                    : []
                  ).map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>
              Models from the shared catalog. An admin can add or remove them in
              Models.
            </FieldDescription>
          </Field>
          {provider === "openrouter" ? (
            <Field>
              <FieldLabel htmlFor="tracky-base-url">OpenRouter base URL</FieldLabel>
              <Input
                id="tracky-base-url"
                value={baseUrl}
                onChange={(event) => schedulePersist({ baseUrl: event.target.value })}
                onBlur={() => persistNow()}
                placeholder="https://openrouter.ai/api/v1"
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="tracky-api-key">API key</FieldLabel>
            <Input
              id="tracky-api-key"
              type="password"
              value={apiKey}
              onChange={(event) => {
                schedulePersist(
                  { apiKey: event.target.value, clearApiKey: false },
                  API_KEY_SAVE_DELAY_MS
                )
              }}
              onBlur={() => persistNow()}
              placeholder={
                settings.hasApiKey && settings.trackyApiKeyLast4
                  ? `Saved …${settings.trackyApiKeyLast4}`
                  : "Paste a key"
              }
              autoComplete="off"
            />
            {settings.hasApiKey ? (
              <FieldDescription>
                Saved keys are encrypted and never shown again.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    persistNow({ clearApiKey: true, apiKey: "", enabled: false })
                  }}
                >
                  Remove key
                </button>
              </FieldDescription>
            ) : (
              <FieldDescription>
                Keys are encrypted on the server and never shown again.
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Cost</FieldLegend>
        <Field>
          <FieldLabel htmlFor="max-turns">Chat history</FieldLabel>
          <FieldDescription>
            Recent user turns kept in full. Older turns are compacted.
          </FieldDescription>
          <Input
            id="max-turns"
            type="number"
            min={1}
            max={40}
            value={config.context.maxChatTurns}
            onChange={(event) =>
              patchContext({ maxChatTurns: Number(event.target.value) || 8 }, "soon")
            }
            onBlur={() => persistNow()}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="max-tool">Tool result size</FieldLabel>
          <FieldDescription>
            Maximum characters from one tool call.
          </FieldDescription>
          <Input
            id="max-tool"
            type="number"
            min={500}
            max={20000}
            value={config.context.maxToolResultChars}
            onChange={(event) =>
              patchContext(
                { maxToolResultChars: Number(event.target.value) || 4000 },
                "soon"
              )
            }
            onBlur={() => persistNow()}
          />
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Tools</FieldLegend>
        <FieldDescription>
          Turn off a group or a single action. Tracky only sees tools that are on.
        </FieldDescription>
        <div className="flex flex-col gap-3">
          {TOOL_GROUPS.map((group) => {
            const ids = group.tools.map((tool) => tool.id)
            const allOn = ids.every((id) => config.tools[id])
            return (
              <div
                key={group.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{group.title}</p>
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  </div>
                  <Switch
                    id={`tool-group-${group.id}`}
                    checked={allOn}
                    onCheckedChange={(checked) => patchTools(ids, checked === true)}
                    aria-label={`${allOn ? "Disable" : "Enable"} ${group.title} tools`}
                  />
                </div>
                <div className="flex flex-col gap-2 border-t pt-2">
                  {group.tools.map((tool) => (
                    <ContextToggle
                      key={tool.id}
                      id={`tool-${tool.id}`}
                      label={tool.label}
                      checked={config.tools[tool.id]}
                      onChange={(value) => patchTools([tool.id], value)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
          {UNGROUPED_TOOLS.map((id) => (
            <ContextToggle
              key={id}
              id={`tool-${id}`}
              label={id.replaceAll("_", " ")}
              checked={config.tools[id]}
              onChange={(value) => patchTools([id], value)}
            />
          ))}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Prompts</FieldLegend>
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="system-prompt">System prompt</FieldLabel>
            <button
              type="button"
              className="shrink-0 text-sm underline disabled:pointer-events-none disabled:opacity-50"
              disabled={config.systemPrompt === null}
              onClick={() =>
                persistNow({
                  config: { ...draftRef.current.config, systemPrompt: null },
                })
              }
            >
              Reset to default
            </button>
          </div>
          <FieldDescription>
            Standing instructions for every Tracky session.
          </FieldDescription>
          <Textarea
            id="system-prompt"
            className="min-h-32 font-mono text-xs"
            value={config.systemPrompt ?? DEFAULT_TRACKY_SYSTEM_PROMPT}
            onChange={(event) =>
              schedulePersist({
                config: {
                  ...draftRef.current.config,
                  systemPrompt: event.target.value,
                },
              })
            }
            onBlur={() => persistNow()}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="generation-prompt">Generation prompt</FieldLabel>
            <button
              type="button"
              className="shrink-0 text-sm underline disabled:pointer-events-none disabled:opacity-50"
              disabled={config.generationPrompt === null}
              onClick={() =>
                persistNow({
                  config: { ...draftRef.current.config, generationPrompt: null },
                })
              }
            >
              Reset to default
            </button>
          </div>
          <FieldDescription>
            Used only when the active roadmap is empty and generate is enabled.
          </FieldDescription>
          <Textarea
            id="generation-prompt"
            className="min-h-32 font-mono text-xs"
            value={
              config.generationPrompt ?? defaultGenerationPrompt("the target role")
            }
            onChange={(event) =>
              schedulePersist({
                config: {
                  ...draftRef.current.config,
                  generationPrompt: event.target.value,
                },
              })
            }
            onBlur={() => persistNow()}
          />
        </Field>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Reset</FieldLegend>
        <FieldDescription>
          Restores tools, cost caps, and both prompts. Provider, API key, and
          models you added are kept.
        </FieldDescription>
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setResetOpen(true)}
          >
            Reset Tracky defaults
          </Button>
        </div>
      </FieldSet>
      <ResetTrackyDefaultsAlert
        open={resetOpen}
        onOpenChange={setResetOpen}
        onConfirm={reset}
      />
    </div>
  )
}

function ContextToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-4">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
        />
      </div>
    </Field>
  )
}
