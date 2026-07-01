import rawMetadata from '../generated/realmzMetadata.json'
import type { CasteProfile, CharacterRecord, ItemCategoryId, ItemMetadata, RaceProfile, RealmzMetadata, SpellMetadata } from './types'

export const metadata = rawMetadata as RealmzMetadata

export const itemsById = new Map<number, ItemMetadata>(
  metadata.items.map((item) => [item.id, item]),
)

export const raceProfilesById = new Map<number, RaceProfile>(
  metadata.raceProfiles.map((race) => [race.id, race]),
)

export const casteProfilesById = new Map<number, CasteProfile>(
  metadata.casteProfiles.map((caste) => [caste.id, caste]),
)

export function itemById(id: number): ItemMetadata | undefined {
  return itemsById.get(Math.abs(id))
}

export function raceProfileById(id: number): RaceProfile | undefined {
  return raceProfilesById.get(id)
}

export function casteProfileById(id: number): CasteProfile | undefined {
  return casteProfilesById.get(id)
}

export function itemName(id: number, identified = true): string {
  const item = itemById(id)
  if (!item) {
    return id ? `Item ${id}` : '(empty)'
  }
  return identified ? item.name : item.unidentifiedName
}

export function itemsForCategory(category: ItemCategoryId): ItemMetadata[] {
  return metadata.items.filter((item) => item.category === category)
}

export function canCharacterUseItem(item: ItemMetadata, record: Pick<CharacterRecord, 'race' | 'caste'>): boolean {
  const race = raceProfileById(record.race)
  const caste = casteProfileById(record.caste)
  if (!race || !caste) {
    return false
  }
  if (item.specificRace && item.specificRace !== record.race) {
    return false
  }
  if (item.specificCaste && item.specificCaste !== record.caste) {
    return false
  }

  const categoryBit = firstSetBit(item.itemcat, 58)
  if (categoryBit < 0) {
    return false
  }
  if (!bitTest(race.itemtypes, categoryBit) || !bitTest(caste.itemtypes, categoryBit)) {
    return false
  }

  for (let bit = 0; bit < 9; bit++) {
    if (bitTestShort(item.raceRestrictions, bit) && bitTestShort(race.descriptors, bit)) {
      return false
    }
    if (bitTestShort(item.raceClassOnly, bit) && !bitTestShort(race.descriptors, bit)) {
      return false
    }
  }

  const casteClassBit = caste.casteClass - 1
  for (let bit = 0; bit < 7; bit++) {
    if (bitTestShort(item.casteRestrictions, bit) && bit === casteClassBit) {
      return false
    }
  }
  return !item.casteClassOnly || bitTestShort(item.casteClassOnly, casteClassBit)
}

export function spellFor(casterType: number, level: number, index: number): SpellMetadata | undefined {
  return metadata.spells.find(
    (spell) => spell.casterType === casterType && spell.level === level && spell.index === index,
  )
}

export function labelFor(list: { id: number; name: string }[], id: number, fallback: string): string {
  return list.find((entry) => entry.id === id)?.name ?? fallback
}

function firstSetBit(words: number[], limit: number): number {
  for (let bit = 0; bit < limit; bit++) {
    if (bitTest(words, bit)) {
      return bit
    }
  }
  return -1
}

function bitTest(words: number[], bit: number): boolean {
  if (bit < 0) {
    return false
  }
  const word = words[Math.trunc(bit / 32)] ?? 0
  return !!(word & (1 << (31 - (bit % 32))))
}

function bitTestShort(value: number, bit: number): boolean {
  return bit >= 0 && !!((value & 0xffff) & (1 << (15 - bit)))
}
