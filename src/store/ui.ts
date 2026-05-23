import { create } from 'zustand'
import { AuthMode, CalcMode, Page, Pace, Unit } from '@/types'
import { keys } from '@/lib/storage'

interface UIState {
  page: Page
  unit: Unit
  calcMode: CalcMode
  pace: Pace
  editId: number | null
  authMode: AuthMode
  syncSheetOpen: boolean
  accountSheetOpen: boolean
  accountMenuOpen: boolean
  toastMessage: string | null
  syncNudgeDismissed: boolean
  celebrationQueue: Array<{ emoji: string; title: string; sub: string }>

  setPage: (p: Page) => void
  setUnit: (u: Unit) => void
  setCalcMode: (m: CalcMode) => void
  setPace: (p: Pace) => void
  setEditId: (id: number | null) => void
  setAuthMode: (m: AuthMode) => void
  openSyncSheet: (mode?: AuthMode) => void
  closeSyncSheet: () => void
  openAccountSheet: () => void
  closeAccountSheet: () => void
  toggleAccountMenu: () => void
  closeAccountMenu: () => void
  showToast: (msg: string) => void
  clearToast: () => void
  dismissSyncNudge: () => void
  queueCelebration: (emoji: string, title: string, sub: string) => void
  shiftCelebration: () => void
}

export const useUI = create<UIState>((set, get) => ({
  page:                (localStorage.getItem(keys.page) as Page) || 'calculator',
  unit:                (localStorage.getItem(keys.unit) as Unit) || 'lbs',
  calcMode:            'weight',
  pace:                'steady',
  editId:              null,
  authMode:            'signin',
  syncSheetOpen:       false,
  accountSheetOpen:    false,
  accountMenuOpen:     false,
  toastMessage:        null,
  syncNudgeDismissed:  !!localStorage.getItem(keys.syncNudgeDismissed),
  celebrationQueue:    [],

  setPage: (p) => {
    localStorage.setItem(keys.page, p)
    set({ page: p })
  },
  setUnit: (u) => {
    localStorage.setItem(keys.unit, u)
    set({ unit: u })
  },
  setCalcMode: (m) => set({ calcMode: m }),
  setPace:     (p) => set({ pace: p }),
  setEditId:   (id) => set({ editId: id }),
  setAuthMode: (m) => set({ authMode: m }),

  openSyncSheet: (mode) => set({
    syncSheetOpen: true,
    authMode: mode ?? (get().authMode),
  }),
  closeSyncSheet:  () => set({ syncSheetOpen: false }),
  openAccountSheet:  () => set({ accountSheetOpen: true }),
  closeAccountSheet: () => set({ accountSheetOpen: false }),
  toggleAccountMenu: () => set(s => ({ accountMenuOpen: !s.accountMenuOpen })),
  closeAccountMenu:  () => set({ accountMenuOpen: false }),

  showToast: (msg) => {
    set({ toastMessage: msg })
    setTimeout(() => set({ toastMessage: null }), 3500)
  },
  clearToast: () => set({ toastMessage: null }),

  dismissSyncNudge: () => {
    localStorage.setItem(keys.syncNudgeDismissed, '1')
    set({ syncNudgeDismissed: true })
  },

  queueCelebration: (emoji, title, sub) =>
    set(s => ({ celebrationQueue: [...s.celebrationQueue, { emoji, title, sub }] })),
  shiftCelebration: () =>
    set(s => ({ celebrationQueue: s.celebrationQueue.slice(1) })),
}))
