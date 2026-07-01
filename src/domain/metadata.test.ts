import { describe, expect, it } from 'vitest'
import { canCharacterUseItem, itemById } from './metadata'

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

  it('matches native race and caste item usability restrictions', () => {
    expect(canCharacterUseItem(itemById(1)!, { race: 1, caste: 1 })).toBe(true)

    expect(canCharacterUseItem(itemById(177)!, { race: 1, caste: 1 })).toBe(true)
    expect(canCharacterUseItem(itemById(177)!, { race: 3, caste: 1 })).toBe(false)

    expect(canCharacterUseItem(itemById(167)!, { race: 1, caste: 3 })).toBe(true)
    expect(canCharacterUseItem(itemById(167)!, { race: 1, caste: 1 })).toBe(false)

    expect(canCharacterUseItem(itemById(100)!, { race: 1, caste: 6 })).toBe(true)
    expect(canCharacterUseItem(itemById(100)!, { race: 1, caste: 1 })).toBe(false)
  })
})
