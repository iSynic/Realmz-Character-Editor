import rawMetadata from '../generated/realmzMetadata.json'
import type { CasteProfile, ItemCategoryId, ItemMetadata, RaceProfile, RealmzMetadata, SpellMetadata } from './types'

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

export function spellFor(casterType: number, level: number, index: number): SpellMetadata | undefined {
  return metadata.spells.find(
    (spell) => spell.casterType === casterType && spell.level === level && spell.index === index,
  )
}

export function labelFor(list: { id: number; name: string }[], id: number, fallback: string): string {
  return list.find((entry) => entry.id === id)?.name ?? fallback
}
