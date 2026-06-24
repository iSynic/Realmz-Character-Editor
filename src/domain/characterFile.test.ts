import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CHARACTER_OFFSETS,
  expectedVerify1,
  expectedVerify2,
  expectedVerify3,
  parseCharacterFile,
  refreshVerification,
  serializeCharacterFile,
  validateCharacter,
  validateCharacterName,
} from './characterFile'
import { applyCharacterMutation } from './editorLogic'
import { removeItem } from './editorLogic'
import { CHARACTER_FILE_SIZE } from './types'

const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const characterRoot = path.join(realmzRoot, 'out_win_clang', 'Character Files')
const hasCharacterFixtures = fs.existsSync(characterRoot)
const fixtureIt = hasCharacterFixtures ? it : it.skip

function loadCharacter(name: string) {
  return fs.readFileSync(path.join(characterRoot, name))
}

describe('Realmz character binary format', () => {
  it('keeps the 872-byte character contract and known offsets', () => {
    expect(CHARACTER_FILE_SIZE).toBe(872)
    expect(CHARACTER_OFFSETS.items).toBe(292)
    expect(CHARACTER_OFFSETS.verify3).toBe(638)
  })

  fixtureIt('round-trips every local 872-byte character file byte-for-byte when unchanged', () => {
    const files = fs
      .readdirSync(characterRoot)
      .filter((name) => fs.statSync(path.join(characterRoot, name)).isFile())
      .filter((name) => fs.readFileSync(path.join(characterRoot, name)).byteLength === CHARACTER_FILE_SIZE)

    expect(files.length).toBeGreaterThan(6)
    for (const name of files) {
      const bytes = new Uint8Array(loadCharacter(name))
      const parsed = parseCharacterFile(bytes, name)
      expect(Buffer.from(serializeCharacterFile(parsed))).toEqual(Buffer.from(bytes))
    }
  })

  fixtureIt('loads bundled characters with valid names and verification fields', () => {
    for (const name of ['Kevlar', 'Lothlorian', 'Silver Leaf', 'Traskelion', 'Trevor', 'Vormale']) {
      const parsed = parseCharacterFile(new Uint8Array(loadCharacter(name)), name)
      expect(parsed.record.version).toBe(-3)
      expect(parsed.record.name).toBe(name)
      expect(validateCharacter(parsed.record)).toEqual([])
    }
  })

  it('validates character names like the native editor', () => {
    expect(validateCharacterName('ModernTrask')).toEqual([])
    expect(validateCharacterName('')).toContain('character name is empty')
    expect(validateCharacterName('Bad/Name')).toContain('character name contains a path separator or control character')
    expect(validateCharacterName('Bad\\Name')).toContain('character name contains a path separator or control character')
    expect(validateCharacterName('Bad:Name')).toContain('character name contains a path separator or control character')
  })

  fixtureIt('refreshes verification fields after edits', () => {
    const parsed = parseCharacterFile(new Uint8Array(loadCharacter('Traskelion')), 'Traskelion')
    parsed.record.money[0] = 123
    parsed.record.money[1] = 45
    parsed.record.money[2] = 6
    parsed.record.stamina = 44
    parsed.record.staminamax = 55
    refreshVerification(parsed.record)
    expect(parsed.record.verify1).toBe(expectedVerify1(parsed.record))
    expect(parsed.record.verify2).toBe(expectedVerify2(parsed.record))
    expect(parsed.record.verify3).toBe(expectedVerify3(parsed.record))

    const reparsed = parseCharacterFile(serializeCharacterFile(parsed), 'Traskelion')
    expect(reparsed.record.money).toEqual([123, 45, 6])
    expect(reparsed.record.stamina).toBe(44)
    expect(reparsed.record.staminamax).toBe(55)
    expect(validateCharacter(reparsed.record)).toEqual([])
  })

  fixtureIt('guards inconsistent spell point fields', () => {
    const parsed = parseCharacterFile(new Uint8Array(loadCharacter('Traskelion')), 'Traskelion')
    parsed.record.spellcastertype = 0
    parsed.record.spellpoints = 5
    parsed.record.spellpointsmax = 0
    refreshVerification(parsed.record)
    expect(validateCharacter(parsed.record).map((issue) => issue.message)).toContain('current spell points require a nonzero spell point max')

    parsed.record.spellpointsmax = 5
    refreshVerification(parsed.record)
    expect(validateCharacter(parsed.record).map((issue) => issue.message)).toContain('spell points require a spellcaster type')

    parsed.record.spellcastertype = 1
    parsed.record.spellpoints = 6
    refreshVerification(parsed.record)
    expect(validateCharacter(parsed.record).map((issue) => issue.message)).toContain('current spell points cannot exceed spell point max')
  })

  fixtureIt('clears stale equipped weapon state when removing an equipped item', () => {
    const parsed = parseCharacterFile(new Uint8Array(loadCharacter('Traskelion')), 'Traskelion')
    const edited = applyCharacterMutation(parsed.record, (draft) => {
      draft.items = draft.items.map(() => ({ id: 0, equip: 0, ident: 0, charge: 0 }))
      draft.numitems = 1
      draft.items[0] = { id: 20, equip: 1, ident: 1, charge: -1 }
      draft.armor[2] = 20
      draft.nohands = 2
      draft.weaponnum = 1
      removeItem(draft, 0)
    })
    expect(edited.armor[2]).toBe(0)
    expect(edited.nohands).toBe(0)
    expect(edited.weaponnum).toBe(0)
  })
})
