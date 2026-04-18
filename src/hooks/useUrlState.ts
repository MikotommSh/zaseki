import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { decodeState } from '../utils/urlCodec'
import type { AppState } from '../types'

export function useUrlState(onLoad: (state: AppState) => void) {
  // Web: 初回ロード時に URL ハッシュから状態を復元
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const state = decodeState(hash)
    if (state) {
      onLoad(state)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [onLoad])

  // Native: zaseki://open#<encoded> で起動・フォアグラウンド復帰時に状態を復元
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listener = App.addListener('appUrlOpen', (event) => {
      const url = new URL(event.url)
      // hash は '#' を除いた部分
      const encoded = url.hash.slice(1)
      if (!encoded) return
      const state = decodeState(encoded)
      if (state) onLoad(state)
    })

    return () => {
      listener.then((l) => l.remove())
    }
  }, [onLoad])
}
