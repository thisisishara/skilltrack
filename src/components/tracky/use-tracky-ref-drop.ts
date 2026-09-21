"use client"

import { useRef, useState, type DragEvent } from "react"

import {
  dataTransferHasTrackRef,
  readTrackyDropRef,
  type TrackyDropRef,
} from "@/domain/tracky/drop-ref"

export function useTrackyRefDrop(onPin: (ref: TrackyDropRef) => void) {
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
    const ref = readTrackyDropRef(event.dataTransfer)
    reset()
    if (!ref) {
      return
    }
    event.preventDefault()
    onPin(ref)
  }

  return { isOver, dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop } }
}
