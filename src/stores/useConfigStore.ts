import { create } from 'zustand'
import type { TagPatterns } from '@shared/types'
import { DEFAULT_TAG_PATTERNS } from '@shared/tagPatterns'

interface ConfigState {
  tagPatterns: TagPatterns
}

export const useConfigStore = create<ConfigState>()(() => ({
  tagPatterns: DEFAULT_TAG_PATTERNS,
}))
