import { create } from 'zustand'
import type { ActiveContext } from '@shared/types'

type ModalKind = 'meeting-prep' | 'skill' | null

interface UIState {
  drawerOpen: boolean
  activeModal: ModalKind
  skillLauncherOpen: boolean
  activeContext: ActiveContext
  selectedSkillId: string | null
  openDrawer: () => void
  closeDrawer: () => void
  openModal: (modal: ModalKind) => void
  closeModal: () => void
  openSkillLauncher: () => void
  closeSkillLauncher: () => void
  setActiveContext: (ctx: ActiveContext) => void
  clearActiveContext: () => void
  setSelectedSkillId: (id: string | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  drawerOpen: false,
  activeModal: null,
  skillLauncherOpen: false,
  activeContext: { kind: null, id: null },
  selectedSkillId: null,

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, activeContext: { kind: null, id: null } }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, selectedSkillId: null }),
  openSkillLauncher: () => set({ skillLauncherOpen: true }),
  closeSkillLauncher: () => set({ skillLauncherOpen: false }),
  setActiveContext: (ctx) => set({ activeContext: ctx }),
  clearActiveContext: () => set({ activeContext: { kind: null, id: null } }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
}))
