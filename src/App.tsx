import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppState } from './store/useAppState'
import { useUrlState } from './hooks/useUrlState'
import { SidePanel } from './components/SidePanel/SidePanel'
import { Canvas } from './components/Canvas/Canvas'
import styles from './App.module.css'

export function App() {
  const appState = useAppState()
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null)
  const [isPlacingLandmark, setIsPlacingLandmark] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleLoadState = useCallback(
    (state: Parameters<typeof appState.loadState>[0]) => {
      appState.loadState(state)
    },
    [appState]
  )

  useUrlState(handleLoadState)

  // ESC キーで配置モード解除
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPlacingLandmark(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={styles.app}>
      <SidePanel
        state={appState.state}
        actions={appState}
        selectedSeatId={selectedSeatId}
        canvasRef={canvasRef}
        isPlacingLandmark={isPlacingLandmark}
        onTogglePlacingLandmark={() => setIsPlacingLandmark((v) => !v)}
      />
      <Canvas
        state={appState.state}
        actions={appState}
        selectedSeatId={selectedSeatId}
        onSelectSeat={setSelectedSeatId}
        canvasRef={canvasRef}
        isPlacingLandmark={isPlacingLandmark}
        onLandmarkPlaced={() => setIsPlacingLandmark(false)}
      />
    </div>
  )
}
