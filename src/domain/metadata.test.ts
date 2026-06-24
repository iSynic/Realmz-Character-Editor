import { describe, expect, it } from 'vitest'
import { itemById } from './metadata'

describe('Realmz metadata', () => {
  it('resolves Bywater supply item text from scenario resources', () => {
    expect(itemById(805)).toMatchObject({
      id: 805,
      category: 'misc',
      name: 'Torch',
      unidentifiedName: 'Torch',
      description: 'A stout stick covered in pitch.',
      iconId: 607,
      type: 24,
      charge: 6,
    })
  })
})
