import { useState, useRef, useCallback } from 'react'
import type { Landmark } from '../../types'
import { useDrag } from '../../hooks/useDrag'
import styles from './LandmarkNode.module.css'

export const LANDMARK_WIDTH = 120
export const LANDMARK_HEIGHT = 52

interface Props {
  landmark: Landmark
  onMove: (x: number, y: number) => void
  onDrop: (x: number, y: number) => void
  onRemove: () => void
  onLabelSave: (label: string) => void
  getBounds: () => { width: number; height: number }
}

export function LandmarkNode({ landmark, onMove, onDrop, onRemove, onLabelSave, getBounds }: Props) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState(landmark.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const drag = useDrag({
    onMove,
    onDrop,
    getBounds,
    seatSize: { width: LANDMARK_WIDTH, height: LANDMARK_HEIGHT },
  })

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setLabelInput(landmark.label)
    setIsEditingLabel(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [landmark.label])

  const commitLabel = useCallback(() => {
    setIsEditingLabel(false)
    const trimmed = labelInput.trim()
    if (trimmed) onLabelSave(trimmed)
    else setLabelInput(landmark.label)
  }, [labelInput, landmark.label, onLabelSave])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitLabel()
    if (e.key === 'Escape') {
      setIsEditingLabel(false)
      setLabelInput(landmark.label)
    }
  }, [commitLabel, landmark.label])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onRemove()
  }, [onRemove])

  return (
    <div
      className={styles.landmark}
      style={{ left: landmark.x, top: landmark.y, width: LANDMARK_WIDTH, height: LANDMARK_HEIGHT }}
      onPointerDown={(e) => drag.onPointerDown(e, landmark.x, landmark.y)}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-testid="landmark"
    >
      {isEditingLabel ? (
        <input
          ref={inputRef}
          className={styles.labelInput}
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          maxLength={16}
        />
      ) : (
        <span className={styles.label}>{landmark.label}</span>
      )}

      <div className={styles.actions} onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={styles.removeBtn}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title="削除"
        >
          ×
        </button>
      </div>
    </div>
  )
}
