import { expect, test } from 'vitest'
import tailwindConfig from '../../tailwind.config'

test('design tokens include lemon accent', () => {
  const colors = (tailwindConfig.theme?.extend as any)?.colors
  expect(colors['accent-lemon']).toBe('#f5d547')
  expect(colors['bg-base']).toBe('#15110e')
})

test('fonts include display and body', () => {
  const fonts = (tailwindConfig.theme?.extend as any)?.fontFamily
  expect(fonts.display).toContain('Fraunces')
  expect(fonts.body).toContain('Inter')
})
