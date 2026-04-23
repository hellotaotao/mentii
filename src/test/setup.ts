import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

function createStorageMock(): Storage {
  const store = new Map<string, string>()

  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key) {
      return store.get(key) ?? null
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key) {
      store.delete(key)
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
  }
}

const localStorageMock = createStorageMock()
const sessionStorageMock = createStorageMock()

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})

import.meta.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321'
import.meta.env.VITE_SUPABASE_ANON_KEY ??= 'test-anon-key'

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})
