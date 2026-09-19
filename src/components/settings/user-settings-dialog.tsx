"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import {
  resetTrackConfigAction,
  saveTrackSettingsAction,
  setNotificationsEnabledAction,
} from "@/application/user-settings/actions"
import { DEFAULT_TRACK_MODELS, defaultTrackConfig } from "@/domain/user-settings/defaults"
import { TRACK_TOOL_IDS, type TrackConfig, type TrackProvider } from "@/domain/user-settings/types"
import { useTrackWorkspace } from "@/components/track/track-workspace"
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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { UsersSettingsPanel } from "@/components/settings/users-settings-panel"
import { DEFAULT_TRACK_SYSTEM_PROMPT, defaultGenerationPrompt } from "@/application/track/prompts"

const PROVIDERS: { id: TrackProvider; label: string }[] = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "OpenAI" },
  { id: "google", label: "Gemini" },
  { id: "openrouter", label: "OpenRouter" },
]

export function UserSettingsDialog() {
  const {
    settings,
    setSettings,
    settingsOpen,
    setSettingsOpen,
    settingsTab,
    setSettingsTab,
    canManageUsers,
  } = useTrackWorkspace()

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        className="flex max-h-[min(90dvh,52rem)] w-full flex-col gap-4 sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>User settings</DialogTitle>
          <DialogDescription>
            Account preferences that apply across every role.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={settingsTab}
          onValueChange={(value) => {
            if (value === "general" || value === "track" || value === "users") {
              setSettingsTab(value)
            }
          }}
          orientation="vertical"
          className="min-h-0 flex-1 gap-6 data-vertical:flex-row"
        >
          <TabsList variant="line" className="w-40 shrink-0">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="track">Track</TabsTrigger>
            {canManageUsers ? <TabsTrigger value="users">Users</TabsTrigger> : null}
          </TabsList>
          <TabsContent value="general" className="min-h-0 overflow-y-auto pr-1">
            <FieldGroup>
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
                  <Switch
                    id="notifications-enabled"
                    checked={settings.notificationsEnabled}
                    onCheckedChange={(checked) => {
                      const enabled = checked === true
                      void setNotificationsEnabledAction(enabled).then((result) => {
                        if (!result.ok) {
                          toast.error(result.message)
                          return
                        }
                        setSettings(result.settings)
                      })
                    }}
                  />
                </div>
              </Field>
            </FieldGroup>
          </TabsContent>
          <TabsContent value="track" className="min-h-0 overflow-y-auto pr-1">
            <TrackSettingsForm />
          </TabsContent>
          {canManageUsers ? (
            <TabsContent value="users" className="min-h-0 overflow-y-auto pr-1">
              <UsersSettingsPanel />
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function TrackSettingsForm() {
  const { settings, setSettings } = useTrackWorkspace()
  const [enabled, setEnabled] = useState(settings.trackEnabled)
  const [provider, setProvider] = useState<TrackProvider | "">(
    settings.trackProvider ?? ""
  )
  const [model, setModel] = useState(settings.trackModel ?? "")
  const [baseUrl, setBaseUrl] = useState(settings.trackBaseUrl ?? "")
  const [apiKey, setApiKey] = useState("")
  const [clearApiKey, setClearApiKey] = useState(false)
  const [config, setConfig] = useState<TrackConfig>(settings.trackConfig)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setEnabled(settings.trackEnabled)
    setProvider(settings.trackProvider ?? "")
    setModel(settings.trackModel ?? "")
    setBaseUrl(settings.trackBaseUrl ?? "")
    setConfig(settings.trackConfig)
    setApiKey("")
    setClearApiKey(false)
  }, [settings])

  function patchContext(patch: Partial<TrackConfig["context"]>) {
    setConfig((current) => ({
      ...current,
      context: { ...current.context, ...patch },
    }))
  }

  async function save() {
    setPending(true)
    const result = await saveTrackSettingsAction({
      enabled,
      provider: provider || null,
      model: model.trim() || (provider ? DEFAULT_TRACK_MODELS[provider] : null),
      baseUrl: baseUrl.trim() || null,
      apiKey: apiKey.trim() || null,
      clearApiKey,
      trackConfig: config,
    })
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      setEnabled(false)
      return
    }
    setSettings(result.settings)
    setEnabled(result.settings.trackEnabled)
    if (enabled && !result.settings.trackEnabled) {
      toast.error("Track stayed off. Add a valid provider, model, and API key.")
      return
    }
    toast.success("Track settings saved")
  }

  async function reset() {
    const result = await resetTrackConfigAction()
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setSettings(result.settings)
    setConfig(defaultTrackConfig())
    toast.success("Track defaults restored")
  }

  return (
    <div className="flex flex-col gap-6">
      {!settings.encryptionConfigured ? (
        <p className="text-sm text-muted-foreground">
          Track cannot store API keys until TRACK_ENCRYPTION_KEY is set on the server.
        </p>
      ) : null}
      <Field>
        <div className="flex items-center justify-between gap-4">
          <div>
            <FieldLabel htmlFor="track-enabled">Enable Track</FieldLabel>
            <FieldDescription>
              Roadmap copilot for the active role. Requires a verified API key.
            </FieldDescription>
          </div>
          <Switch
            id="track-enabled"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
        </div>
      </Field>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="track-provider">Provider</FieldLabel>
          <select
            id="track-provider"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={provider}
            onChange={(event) => {
              const next = event.target.value as TrackProvider | ""
              setProvider(next)
              if (next && !model) {
                setModel(DEFAULT_TRACK_MODELS[next])
              }
            }}
          >
            <option value="">Choose one</option>
            {PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="track-model">Model</FieldLabel>
          <Input
            id="track-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={provider ? DEFAULT_TRACK_MODELS[provider] : "model id"}
          />
        </Field>
        {provider === "openrouter" ? (
          <Field>
            <FieldLabel htmlFor="track-base-url">OpenRouter base URL</FieldLabel>
            <Input
              id="track-base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://openrouter.ai/api/v1"
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="track-api-key">API key</FieldLabel>
          <Input
            id="track-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => {
              setApiKey(event.target.value)
              setClearApiKey(false)
            }}
            placeholder={
              settings.hasApiKey && settings.trackApiKeyLast4
                ? `Saved …${settings.trackApiKeyLast4}`
                : "Paste a key"
            }
            autoComplete="off"
          />
          {settings.hasApiKey ? (
            <FieldDescription>
              Leave blank to keep the saved key.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setClearApiKey(true)
                  setApiKey("")
                  setEnabled(false)
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

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">What Track can see</h3>
        <ContextToggle
          id="ctx-index"
          label="Include title index"
          checked={config.context.includeTitleIndex}
          onChange={(value) => patchContext({ includeTitleIndex: value })}
        />
        <Field>
          <FieldLabel htmlFor="max-index">Max topics in index</FieldLabel>
          <Input
            id="max-index"
            type="number"
            min={1}
            max={400}
            value={config.context.maxIndexTopics}
            onChange={(event) =>
              patchContext({ maxIndexTopics: Number(event.target.value) || 80 })
            }
          />
        </Field>
        <ContextToggle
          id="ctx-focus"
          label="Include focused topic details"
          checked={config.context.includeFocusedTopicDetails}
          onChange={(value) => patchContext({ includeFocusedTopicDetails: value })}
        />
        <ContextToggle
          id="ctx-attach"
          label="Attach focused topic automatically"
          checked={config.context.attachFocusedTopic}
          onChange={(value) => patchContext({ attachFocusedTopic: value })}
        />
        <ContextToggle
          id="ctx-desc"
          label="Include descriptions"
          checked={config.context.includeDescriptions}
          onChange={(value) => patchContext({ includeDescriptions: value })}
        />
        <ContextToggle
          id="ctx-notes"
          label="Include notes"
          checked={config.context.includeNotes}
          onChange={(value) => patchContext({ includeNotes: value })}
        />
        <ContextToggle
          id="ctx-tasks"
          label="Include tasks"
          checked={config.context.includeTasks}
          onChange={(value) => patchContext({ includeTasks: value })}
        />
        <ContextToggle
          id="ctx-links"
          label="Include links"
          checked={config.context.includeLinks}
          onChange={(value) => patchContext({ includeLinks: value })}
        />
        <ContextToggle
          id="ctx-pending"
          label="Include pending proposals"
          checked={config.context.includePendingProposals}
          onChange={(value) => patchContext({ includePendingProposals: value })}
        />
        <Field>
          <FieldLabel htmlFor="max-turns">Max chat turns kept verbatim</FieldLabel>
          <Input
            id="max-turns"
            type="number"
            min={1}
            max={40}
            value={config.context.maxChatTurns}
            onChange={(event) =>
              patchContext({ maxChatTurns: Number(event.target.value) || 8 })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="max-tool">Max tool-result characters</FieldLabel>
          <Input
            id="max-tool"
            type="number"
            min={500}
            max={20000}
            value={config.context.maxToolResultChars}
            onChange={(event) =>
              patchContext({
                maxToolResultChars: Number(event.target.value) || 4000,
              })
            }
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Tools</h3>
        {TRACK_TOOL_IDS.map((id) => (
          <ContextToggle
            key={id}
            id={`tool-${id}`}
            label={id.replaceAll("_", " ")}
            checked={config.tools[id]}
            onChange={(value) =>
              setConfig((current) => ({
                ...current,
                tools: { ...current.tools, [id]: value },
              }))
            }
          />
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="system-prompt">System prompt</FieldLabel>
        <Textarea
          id="system-prompt"
          className="min-h-32 font-mono text-xs"
          value={config.systemPrompt ?? DEFAULT_TRACK_SYSTEM_PROMPT}
          onChange={(event) =>
            setConfig((current) => ({
              ...current,
              systemPrompt: event.target.value,
            }))
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="generation-prompt">Generation prompt</FieldLabel>
        <Textarea
          id="generation-prompt"
          className="min-h-32 font-mono text-xs"
          value={
            config.generationPrompt ?? defaultGenerationPrompt("the target role")
          }
          onChange={(event) =>
            setConfig((current) => ({
              ...current,
              generationPrompt: event.target.value,
            }))
          }
        />
        <FieldDescription>
          Used only when the active roadmap is empty and generate is enabled.
        </FieldDescription>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={pending}>
          {pending ? "Saving…" : "Save Track"}
        </Button>
        <Button type="button" variant="outline" onClick={() => void reset()}>
          Reset to defaults
        </Button>
      </div>
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
