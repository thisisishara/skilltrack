"use client"

import { useRef, useState, type DragEvent } from "react"

import {
  dataTransferHasTrackRef,
  readTrackDropRef,
  type TrackDropRef,
} from "@/domain/track/drop-ref"

export function useTrackRefDrop(onPin: (ref: TrackDropRef) => void) {
  const [isOver, setIsOver] = useState(false)
  const depthRef = useRef(0)

  function reset() {
    depthRef.current = 0
    setIsOver(false)
  }

  function onDragEnter(event: DragEvent<HTMLElement>) {
    if (!dataTransferHasTrackRef(event.dataTransfer)) {
      return
    }
    event.preventDefault()
    depthRef.current += 1
    setIsOver(true)
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    if (!dataTransferHasTrackRef(event.dataTransfer)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function onDragLeave() {
    depthRef.current = Math.max(0, depthRef.current - 1)
    if (depthRef.current === 0) {
      setIsOver(false)
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    const ref = readTrackDropRef(event.dataTransfer)
    reset()
    if (!ref) {
      return
    }
    event.preventDefault()
    onPin(ref)
  }

  return { isOver, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
