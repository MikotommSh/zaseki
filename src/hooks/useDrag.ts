import { useRef, useCallback } from 'react'

interface DragOptions {
  onMove: (x: number, y: number) => void
  onDrop: (x: number, y: number) => void
  onClick?: () => void
  getBounds?: () => { width: number; height: number }
  seatSize?: { width: number; height: number }
  scale?: number
}

const DRAG_THRESHOLD = 4

export function useDrag(options: DragOptions) {
  const isDragging = useRef(false)
  const hasMoved = useRef(false)
  const startPointer = useRef({ x: 0, y: 0 })
  const startSeat = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback(
    (e: React.PointerEvent, currentX: number, currentY: number) => {
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      isDragging.current = true
      hasMoved.current = false
      startPointer.current = { x: e.clientX, y: e.clientY }
      startSeat.current = { x: currentX, y: currentY }
    },
    []
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      const s = options.scale ?? 1
      const dx = (e.clientX - startPointer.current.x) / s
      const dy = (e.clientY - startPointer.current.y) / s

      if (!hasMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      hasMoved.current = true

      let newX = startSeat.current.x + dx
      let newY = startSeat.current.y + dy

      if (options.getBounds && options.seatSize) {
        const bounds = options.getBounds()
        newX = Math.max(0, Math.min(newX, bounds.width - options.seatSize.width))
        newY = Math.max(0, Math.min(newY, bounds.height - options.seatSize.height))
      }

      options.onMove(newX, newY)
    },
    [options]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return
      isDragging.current = false

      if (!hasMoved.current) {
        options.onClick?.()
        return
      }

      const s = options.scale ?? 1
      const dx = (e.clientX - startPointer.current.x) / s
      const dy = (e.clientY - startPointer.current.y) / s
      let newX = startSeat.current.x + dx
      let newY = startSeat.current.y + dy

      if (options.getBounds && options.seatSize) {
        const bounds = options.getBounds()
        newX = Math.max(0, Math.min(newX, bounds.width - options.seatSize.width))
        newY = Math.max(0, Math.min(newY, bounds.height - options.seatSize.height))
      }

      options.onDrop(newX, newY)
    },
    [options]
  )

  return { onPointerDown, onPointerMove, onPointerUp }
}
