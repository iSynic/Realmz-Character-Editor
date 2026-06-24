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
import { casteProfileById, raceProfileById } from './metadata'
import {
  activeSpellProgressionForCaste,
  applyCharacterMutation,
  clearBadEffects,
  levelUpCharacter,
  removeItem,
  spellProgressionForCaste,
  type LevelUpResult,
} from './editorLogic'
import {
  CHARACTER_FILE_SIZE,
  CONDITION_COUNT,
  DEFINE_SPELL_ROWS,
  MAX_ITEMS,
  SAVE_COUNT,
  SPECIAL_COUNT,
  SPEC_COUNT,
  SPELL_LEVELS,
  SPELLS_PER_LEVEL,
  type CharacterRecord,
} from './types'

const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const characterRoot = path.join(realmzRoot, 'out_win_clang', 'Character Files')
const hasCharacterFixtures = fs.existsSync(characterRoot)
const fixtureIt = hasCharacterFixtures ? it : it.skip

function loadCharacter(name: string) {
  return fs.readFileSync(path.join(characterRoot, name))
}

function testRecord(overrides: Partial<CharacterRecord> = {}): CharacterRecord {
  return {
    version: -3,
    verify1: 0,
    tohit: 0,
    dodge: 0,
    missile: 0,
    twohand: 0,
    traiter: 0,
    normattacks: 0,
    beenattacked: 0,
    guarding: 0,
    target: 0,
    numitems: 0,
    weaponsound: 0,
    underneath: 0,
    face: 0,
    attackbonus: 0,
    magco: 0,
    position: 0,
    maglu: 0,
    magst: 0,
    magres: 0,
    movebonus: 0,
    ac: 0,
    damage: 0,
    race: 1,
    caste: 1,
    spellcastertype: 0,
    gender: 0,
    level: 1,
    movement: 0,
    movementmax: 0,
    attacks: 0,
    nspells: Array.from({ length: SPELL_LEVELS }, () => 0),
    stamina: 10,
    staminamax: 10,
    pictid: 0,
    iconid: 0,
    spellpoints: 0,
    spellpointsmax: 0,
    nohands: 0,
    weaponnum: 0,
    missilenum: 0,
    handtohand: 0,
    condition: Array.from({ length: CONDITION_COUNT }, () => 0),
    special: Array.from({ length: SPECIAL_COUNT }, () => 0),
    armor: Array.from({ length: 20 }, () => 0),
    spec: Array.from({ length: SPEC_COUNT }, () => 0),
    save: Array.from({ length: SAVE_COUNT }, () => 0),
    currentagegroup: 0,
    verify2: 0,
    items: Array.from({ length: MAX_ITEMS }, () => ({ id: 0, equip: 0, ident: 0, charge: 0 })),
    scrollcase: Array.from({ length: 5 }, () => ({ castcaste: 0, castlevel: 0, castnum: 0, powerlevel: 0 })),
    age: 0,
    exp: 0,
    load: 0,
    loadmax: 0,
    money: [0, 0, 0],
    hasturned: 0,
    canheal: 0,
    canidentify: 0,
    candetect: 0,
    toggle: 0,
    bleeding: 0,
    inbattle: 0,
    st: 16,
    in: 16,
    wi: 16,
    de: 16,
    co: 16,
    lu: 16,
    cspells: Array.from({ length: SPELL_LEVELS }, () => Array.from({ length: SPELLS_PER_LEVEL }, () => 0)),
    name: 'Test',
    nameBytes: Array.from({ length: 30 }, () => 0),
    verify3: 0,
    damagetaken: 0,
    damagegiven: 0,
    hitsgiven: 0,
    hitstaken: 0,
    imissed: 0,
    umissed: 0,
    kills: 0,
    deaths: 0,
    knockouts: 0,
    spellscast: 0,
    destroyed: 0,
    turns: 0,
    prestigepenelty: 0,
    definespells: Array.from({ length: DEFINE_SPELL_ROWS }, () => [0, 0, 0, 0]),
    maxspellsattacks: 0,
    spellsofar: 0,
    spare: Array.from({ length: 96 }, () => 0),
    ...overrides,
  }
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

  it('gates caste spell progression by current level', () => {
    const rogue = casteProfileById(5)
    const fencer = casteProfileById(14)

    expect(spellProgressionForCaste(rogue)).toMatchObject({
      casterType: 1,
      startLevel: 15,
      maxSpellLevel: 3,
    })
    expect(activeSpellProgressionForCaste(rogue, 14)).toBeNull()
    expect(activeSpellProgressionForCaste(rogue, 15)).toMatchObject({
      casterType: 1,
      startLevel: 15,
      maxSpellLevel: 3,
    })
    expect(spellProgressionForCaste(fencer)).toBeNull()
  })

  it('does not assign a future spellcaster type during level up', () => {
    const record = testRecord({ caste: 5, level: 13, spellcastertype: 0 })

    const waiting = levelUpCharacter(record, () => 0)
    expect(waiting?.level).toBe(14)
    expect(record.spellcastertype).toBe(0)
    expect(record.spellpoints).toBe(0)
    expect(record.spellpointsmax).toBe(0)

    const unlocked = levelUpCharacter(record, () => 0)
    expect(unlocked?.level).toBe(15)
    expect(record.spellcastertype).toBe(1)
    expect(unlocked?.spellpointsGain).toBe(16)
    expect(record.spellpoints).toBe(16)
    expect(record.spellpointsmax).toBe(16)
  })

  fixtureIt('applies native-style level-up math from race and caste data', () => {
    const parsed = parseCharacterFile(new Uint8Array(loadCharacter('Traskelion')), 'Traskelion')
    const before = structuredClone(parsed.record)
    const race = raceProfileById(before.race)
    const caste = casteProfileById(before.caste)
    expect(race).toBeDefined()
    expect(caste).toBeDefined()

    let result: LevelUpResult | null = null
    const edited = applyCharacterMutation(parsed.record, (draft) => {
      result = levelUpCharacter(draft, () => 0)
    })
    const levelUp = result as LevelUpResult

    const nextLevel = before.level + 1
    const victoryIndex = Math.min(Math.max(before.level, 1), 30) - 1
    const expectedVictorySpend = caste!.victory[victoryIndex] ?? 0
    const expectedStaminaGain = 1 + Math.min(Math.max(before.co - 16, 0), caste!.maxStaminaBonus)
    const expectedMissileGain = caste!.missile[1] ? 1 : 0
    const expectedMagresGain = before.wi + before.in + before.co >= 1 ? 1 : 0

    const expectedProgression = activeSpellProgressionForCaste(caste, nextLevel, before.spellcastertype)
    const expectedSpellcasterType = expectedProgression?.casterType ?? before.spellcastertype

    let expectedSpellpointsGain = 0
    if (expectedProgression && nextLevel > 1) {
      expectedSpellpointsGain = nextLevel + 1
    }

    let expectedNormAttacks = (race!.numOfAttacks[0] ?? 0) + caste!.bonusAttacks
    for (const attackLevel of caste!.attacks) {
      if (attackLevel !== 0 && attackLevel <= nextLevel) {
        expectedNormAttacks++
      }
    }
    expectedNormAttacks = Math.min(expectedNormAttacks, 2 * (race!.numOfAttacks[1] ?? 0), 12)

    expect(levelUp).not.toBeNull()
    expect(edited.level).toBe(nextLevel)
    expect(edited.exp).toBe(before.exp - expectedVictorySpend)
    expect(edited.normattacks).toBe(expectedNormAttacks)
    expect(edited.tohit).toBe(before.tohit + (caste!.tohit[1] ?? 0))
    expect(edited.dodge).toBeGreaterThanOrEqual(0)
    expect(edited.dodge).toBeLessThanOrEqual(100)
    expect(edited.missile).toBe(Math.min(100, before.missile + expectedMissileGain))
    expect(edited.handtohand).toBeLessThanOrEqual(200)
    expect(edited.magres).toBe(Math.min(100, before.magres + expectedMagresGain))
    expect(edited.stamina).toBe(before.stamina + expectedStaminaGain)
    expect(edited.staminamax).toBe(before.staminamax + expectedStaminaGain)
    expect(edited.spellcastertype).toBe(expectedSpellcasterType)
    expect(edited.spellpoints).toBe(before.spellpoints + expectedSpellpointsGain)
    expect(edited.spellpointsmax).toBe(before.spellpointsmax + expectedSpellpointsGain)
    expect(levelUp).toMatchObject({
      level: nextLevel,
      staminaGain: expectedStaminaGain,
      spellpointsGain: expectedSpellpointsGain,
      magresGain: expectedMagresGain,
      missileGain: expectedMissileGain,
      victoryPointsSpent: expectedVictorySpend,
    })
    expect(edited.verify1).toBe(expectedVerify1(edited))
    expect(edited.verify2).toBe(expectedVerify2(edited))
    expect(edited.verify3).toBe(expectedVerify3(edited))
    expect(validateCharacter(edited)).toEqual([])

    const reparsed = parseCharacterFile(serializeCharacterFile({ ...parsed, record: edited }), 'Traskelion')
    expect(reparsed.record.level).toBe(nextLevel)
    expect(validateCharacter(reparsed.record)).toEqual([])
  })

  fixtureIt('clears bad condition effects without removing beneficial conditions', () => {
    const parsed = parseCharacterFile(new Uint8Array(loadCharacter('Traskelion')), 'Traskelion')
    let cleared = 0
    const edited = applyCharacterMutation(parsed.record, (draft) => {
      draft.condition = Array.from({ length: draft.condition.length }, () => 0)
      draft.condition[3] = -1
      draft.condition[6] = 4
      draft.condition[10] = 8
      draft.condition[21] = -1
      draft.condition[32] = -3
      draft.condition[38] = 5
      cleared = clearBadEffects(draft)
    })

    expect(cleared).toBe(3)
    expect(edited.condition[3]).toBe(0)
    expect(edited.condition[6]).toBe(0)
    expect(edited.condition[32]).toBe(0)
    expect(edited.condition[10]).toBe(8)
    expect(edited.condition[21]).toBe(-1)
    expect(edited.condition[38]).toBe(5)
    expect(validateCharacter(edited)).toEqual([])
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
