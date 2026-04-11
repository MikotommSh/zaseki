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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640)
  const [activeTab, setActiveTab] = useState<'canvas' | 'panel'>('canvas')
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

  // ウィンドウ幅の監視
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const sidePanel = (
    <SidePanel
      state={appState.state}
      actions={appState}
      selectedSeatId={selectedSeatId}
      canvasRef={canvasRef}
      isPlacingLandmark={isPlacingLandmark}
      onTogglePlacingLandmark={() => setIsPlacingLandmark((v) => !v)}
      onAfterShuffle={isMobile ? () => setActiveTab('canvas') : undefined}
    />
  )

  const canvas = (
    <Canvas
      state={appState.state}
      actions={appState}
      selectedSeatId={selectedSeatId}
      onSelectSeat={setSelectedSeatId}
      canvasRef={canvasRef}
      isPlacingLandmark={isPlacingLandmark}
      onLandmarkPlaced={() => setIsPlacingLandmark(false)}
      onTogglePlacingLandmark={() => setIsPlacingLandmark((v) => !v)}
    />
  )

  if (isMobile) {
    return (
      <div className={styles.app}>
        {activeTab === 'panel' ? sidePanel : canvas}
        <nav className={styles.tabBar}>
          <button
            className={activeTab === 'canvas' ? styles.tabActive : styles.tabBtn}
            onClick={() => setActiveTab('canvas')}
          >
            🗺 キャンバス
          </button>
          <button
            className={activeTab === 'panel' ? styles.tabActive : styles.tabBtn}
            onClick={() => setActiveTab('panel')}
          >
            👥 出席者
          </button>
        </nav>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      {sidePanel}
      {canvas}
    </div>
  )
}
