"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"

import {
  addTrackyCatalogModelAction,
  removeTrackyCatalogModelAction,
} from "@/application/user-settings/actions"
import { useTrackyWorkspace } from "@/components/tracky/tracky-workspace"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  TRACKY_PROVIDER_OPTIONS,
  addExtraModel,
  emptyExtraModels,
  modelsForProvider,
} from "@/domain/user-settings/models"
import type { TrackyProvider } from "@/domain/user-settings/types"

export function ModelsSettingsPanel() {
  const { settings, setSettings, canManageUsers } = useTrackyWorkspace()
  const extraModels = settings.extraModels ?? emptyExtraModels()
  const [draft, setDraft] = useState<Record<TrackyProvider, string>>({
    anthropic: "",
    openai: "",
    google: "",
    openrouter: "",
  })
  const [pending, setPending] = useState(false)

  async function addModel(provider: TrackyProvider) {
    const preview = addExtraModel(extraModels, provider, draft[provider])
    if (!preview.ok) {
      toast.error(preview.message)
      return
    }
    setPending(true)
    const result = await addTrackyCatalogModelAction(provider, draft[provider])
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setDraft((current) => ({ ...current, [provider]: "" }))
    setSettings({ ...settings, extraModels: result.extraModels })
  }

  async function removeModel(provider: TrackyProvider, modelId: string) {
    setPending(true)
    const result = await removeTrackyCatalogModelAction(provider, modelId)
    setPending(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setSettings({ ...settings, extraModels: result.extraModels })
  }

  if (!canManageUsers) {
    return null
  }

  return (
    <FieldSet>
      <FieldLegend>Models</FieldLegend>
      <FieldDescription>
        These ids appear in Tracky for every user. Any of them can be removed.
      </FieldDescription>
      <div className="flex flex-col gap-4">
        {TRACKY_PROVIDER_OPTIONS.map((item) => {
          const models = modelsForProvider(item.id, extraModels)
          return (
            <div key={item.id} className="flex flex-col gap-2">
              <p className="text-sm font-medium">{item.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {models.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No models yet.</p>
                ) : (
                  models.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="h-6 max-w-full gap-1 pr-0.5 font-mono font-normal"
                    >
                      <span className="truncate">{id}</span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="size-5"
                        aria-label={`Remove ${id}`}
                        disabled={pending}
                        onClick={() => void removeModel(item.id, id)}
                      >
                        <X />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id={`catalog-model-${item.id}`}
                  value={draft[item.id]}
                  disabled={pending}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="Add a model id"
                  className="font-mono"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void addModel(item.id)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => void addModel(item.id)}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </FieldSet>
  )
}
