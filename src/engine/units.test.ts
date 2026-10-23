import { describe, expect, it } from 'vitest'
import { baseUnit, formatUnit } from './units'

describe('units', () => {
  it('reduces inflected forms to the base unit', () => {
    expect(['sztuki', 'sztuk', 'łyżek', 'plastrów', 'ząbku'].map(baseUnit)).toEqual([
      'sztuka',
      'sztuka',
      'łyżka',
      'plaster',
      'ząbek',
    ])
  })

  it('inflects the unit for the amount', () => {
    const forms = [1, 2, 5, 12, 22, 0.5, 1.5].map((n) => `${n} ${formatUnit(n, 'sztuki')}`)
    expect(forms).toEqual(['1 sztuka', '2 sztuki', '5 sztuk', '12 sztuk', '22 sztuki', '0.5 sztuki', '1.5 sztuki'])
    expect(formatUnit(0.5, 'ząbek')).toBe('ząbka')
  })

  it('leaves unknown units alone', () => {
    expect(formatUnit(2, 'puszka')).toBe('puszka')
  })
})
