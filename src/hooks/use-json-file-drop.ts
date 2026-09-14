"use client"

import { useCallback, useRef, useState, type DragEvent } from "react"
import { toast } from "sonner"

import {
  dataTransferHasFiles,
  readJsonFromDataTransfer,
} from "@/lib/roadmap/json-file"

export function useJsonFileDrop(onJson: (text: string) => void, enabled = true) {
  const [isOver, setIsOver] = useState(false)
  const depth = useRef(0)

  const reset = useCallback(() => {
    depth.current = 0
    setIsOver(false)
  }, [])

  const onDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || !dataTransferHasFiles(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      depth.current += 1
      setIsOver(true)
    },
    [enabled]
  )

  const onDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled || !dataTransferHasFiles(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
    },
    [enabled]
  )

  const onDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled || !dataTransferHasFiles(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) {
        setIsOver(false)
      }
    },
    [enabled]
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled || !dataTransferHasFiles(event.dataTransfer)) {
        return
      }

      event.preventDefault()
      reset()

      void readJsonFromDataTransfer(event.dataTransfer).then((result) => {
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        onJson(result.text)
      })
    },
    [enabled, onJson, reset]
  )

  return {
    isOver,
    dropProps: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    },
  }
}
