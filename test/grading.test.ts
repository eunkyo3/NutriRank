import { describe, expect, it } from 'vitest'
import { gradeProduct } from '@/lib/grading'

describe('gradeProduct (smoke)', () => {
  it('is a function', () => {
    expect(typeof gradeProduct).toBe('function')
  })

  it('marks an all-null nutrient profile as not gradable', () => {
    const result = gradeProduct(
      {
        energy_kcal: null,
        sugars_g: null,
        satfat_g: null,
        sodium_mg: null,
        fiber_g: null,
        protein_g: null,
      },
      'solid',
    )

    expect(result.gradable).toBe(false)
  })
})
