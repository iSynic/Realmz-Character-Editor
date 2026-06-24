import { itemById, spellFor } from './metadata'
import { clampSigned, refreshVerification } from './characterFile'
import { MAX_ITEMS, SPELL_LEVELS, SPELLS_PER_LEVEL, type CharacterRecord, type ItemEntry } from './types'

export function applyCharacterMutation(record: CharacterRecord, mutate: (draft: CharacterRecord) => void): CharacterRecord {
  const draft = structuredClone(record)
  mutate(draft)
  normalizeSpells(draft)
  normalizeInventory(draft)
  refreshVerification(draft)
  return draft
}

export function setSpellcasterType(record: CharacterRecord, value: number): void {
  record.spellcastertype = clampSigned(value, 0, 5)
  if (record.spellcastertype <= 0) {
    record.spellpoints = 0
    record.spellpointsmax = 0
    record.cspells = Array.from({ length: SPELL_LEVELS }, () => Array.from({ length: SPELLS_PER_LEVEL }, () => 0))
  }
}

export function setSpellpointsCurrent(record: CharacterRecord, value: number): void {
  const clamped = clampSigned(value, 0, 32767)
  if (clamped > 0 && record.spellpointsmax <= 0) {
    record.spellpointsmax = clamped
    record.spellpoints = clamped
    return
  }
  record.spellpoints = record.spellpointsmax > 0 ? Math.min(clamped, record.spellpointsmax) : 0
}

export function setSpellpointsMax(record: CharacterRecord, value: number): void {
  record.spellpointsmax = clampSigned(value, 0, 32767)
  if (record.spellpointsmax <= 0) {
    record.spellpointsmax = 0
    record.spellpoints = 0
  } else if (record.spellpoints > record.spellpointsmax) {
    record.spellpoints = record.spellpointsmax
  }
}

export function normalizeSpells(record: CharacterRecord): void {
  for (let level = 0; level < SPELL_LEVELS; level++) {
    record.nspells[level] = 0
    for (let spell = 0; spell < SPELLS_PER_LEVEL; spell++) {
      record.cspells[level][spell] = record.cspells[level][spell] ? 1 : 0
    }
  }
  record.canheal = 0
  record.canidentify = 0
  record.candetect = 0
  if (record.spellcastertype > 0 && record.spellcastertype <= 5) {
    for (let level = 0; level < SPELL_LEVELS; level++) {
      for (let spell = 0; spell < SPELLS_PER_LEVEL; spell++) {
        if (record.cspells[level][spell]) {
          const info = spellFor(record.spellcastertype, level, spell)
          if (info?.special === 57) {
            record.canheal = 1
          }
          if (info?.special === 48) {
            record.canidentify = 1
          }
          if (info?.special === 63) {
            record.candetect = 1
          }
        }
      }
    }
  }
  for (const row of record.definespells) {
    const level = row[1]
    const spell = row[2]
    if (level < 0 || level >= SPELL_LEVELS || spell < 0 || spell >= SPELLS_PER_LEVEL || !record.cspells[level][spell]) {
      row[0] = 0
      row[1] = 0
      row[2] = 0
      row[3] = 0
    }
  }
}

export function normalizeInventory(record: CharacterRecord): void {
  const compacted = record.items.filter((item) => item.id !== 0).slice(0, MAX_ITEMS)
  while (compacted.length < MAX_ITEMS) {
    compacted.push(blankItem())
  }
  record.items = compacted
  record.numitems = record.items.filter((item) => item.id !== 0).length
  let load = record.money[0]
  for (let i = 0; i < record.numitems; i++) {
    const item = itemById(record.items[i].id)
    if (item) {
      load += item.weight + record.items[i].charge * item.xcharge
    }
  }
  record.load = clampSigned(load, 0, 65535)
  normalizeEquipment(record)
}

export function addItem(record: CharacterRecord, itemId: number): boolean {
  normalizeInventory(record)
  const item = itemById(itemId)
  if (record.numitems >= MAX_ITEMS || !item) {
    return false
  }
  record.items[record.numitems] = {
    id: item.id,
    equip: 0,
    ident: 1,
    charge: item.charge,
  }
  record.numitems += 1
  normalizeInventory(record)
  return true
}

export function removeItem(record: CharacterRecord, index: number): boolean {
  normalizeInventory(record)
  if (index < 0 || index >= record.numitems) {
    return false
  }
  const removedId = record.items[index].id
  clearEquipmentForItem(record, removedId)
  record.items.splice(index, 1)
  record.items.push(blankItem())
  normalizeInventory(record)
  return true
}

export function pairedCombatIconForPortrait(portraitId: number): number {
  return portraitId + 8743
}

function blankItem(): ItemEntry {
  return { id: 0, equip: 0, ident: 0, charge: 0 }
}

function clearEquipmentForItem(record: CharacterRecord, itemId: number): void {
  record.armor = record.armor.map((slot) => (slot === itemId ? 0 : slot))
}

function equippedInventoryItem(record: CharacterRecord, itemId: number): ItemEntry | undefined {
  return record.items.slice(0, record.numitems).find((item) => item.id === itemId && item.equip)
}

function normalizeEquipment(record: CharacterRecord): void {
  let hands = 0
  for (let slot = 0; slot < record.armor.length; slot++) {
    const itemId = record.armor[slot]
    if (!itemId) {
      continue
    }
    if (!itemById(itemId) || !equippedInventoryItem(record, itemId)) {
      record.armor[slot] = 0
    }
  }

  record.weaponnum = 0
  if (record.armor[2] !== 0) {
    const item = itemById(record.armor[2])
    hands = clampSigned(item?.nohands ?? 0, 0, 2)
    const equipped = equippedInventoryItem(record, record.armor[2])
    if (equipped) {
      record.weaponnum = equipped.ident ? 1 : 0
    }
  }

  if (record.armor[3] !== 0) {
    hands = Math.min(2, hands + 1)
  }

  record.missilenum = 0
  if (record.armor[15] !== 0) {
    const equipped = equippedInventoryItem(record, record.armor[15])
    if (equipped) {
      record.missilenum = equipped.ident ? 1 : 0
    }
  }
  record.nohands = hands
}
