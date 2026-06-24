import { decodeMacRoman, encodeMacRoman } from './macRoman'
import { itemById } from './metadata'
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
  type CharacterFile,
  type CharacterRecord,
  type ItemEntry,
  type ScrollEntry,
  type ValidationIssue,
} from './types'

const ITEM_SIZE = 6
const SCROLL_SIZE = 4

class Cursor {
  offset = 0
  private readonly view: DataView

  constructor(view: DataView) {
    this.view = view
  }

  i16(): number {
    const value = this.view.getInt16(this.offset, false)
    this.offset += 2
    return value
  }

  u16(): number {
    const value = this.view.getUint16(this.offset, false)
    this.offset += 2
    return value
  }

  i32(): number {
    const value = this.view.getInt32(this.offset, false)
    this.offset += 4
    return value
  }

  u8(): number {
    const value = this.view.getUint8(this.offset)
    this.offset += 1
    return value
  }

  i8(): number {
    const value = this.view.getInt8(this.offset)
    this.offset += 1
    return value
  }

  bytes(count: number): number[] {
    const ret: number[] = []
    for (let i = 0; i < count; i++) {
      ret.push(this.u8())
    }
    return ret
  }

  align2(): void {
    if (this.offset % 2 !== 0) {
      this.offset += 1
    }
  }
}

function writeI16(view: DataView, offset: number, value: number): void {
  view.setInt16(offset, clampSigned(value, -32768, 32767), false)
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, clampSigned(value, 0, 65535), false)
}

function writeI32(view: DataView, offset: number, value: number): void {
  view.setInt32(offset, clampSigned(value, -2147483648, 2147483647), false)
}

function writeU8(view: DataView, offset: number, value: number): void {
  view.setUint8(offset, clampSigned(value, 0, 255))
}

function writeI8(view: DataView, offset: number, value: number): void {
  view.setInt8(offset, clampSigned(value, -128, 127))
}

export function clampSigned(value: number, min: number, max: number): number {
  return Math.trunc(Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0)))
}

function readI16Array(cursor: Cursor, count: number): number[] {
  return Array.from({ length: count }, () => cursor.i16())
}

function readItems(cursor: Cursor): ItemEntry[] {
  return Array.from({ length: MAX_ITEMS }, () => ({
    id: cursor.i16(),
    equip: cursor.u8(),
    ident: cursor.u8(),
    charge: cursor.i16(),
  }))
}

function readScrollcase(cursor: Cursor): ScrollEntry[] {
  return Array.from({ length: 5 }, () => ({
    castcaste: cursor.i8(),
    castlevel: cursor.i8(),
    castnum: cursor.i8(),
    powerlevel: cursor.i8(),
  }))
}

export function parseCharacterFile(bytes: Uint8Array, fileName = 'Character'): CharacterFile {
  if (bytes.byteLength !== CHARACTER_FILE_SIZE) {
    throw new Error(`Realmz character files must be exactly ${CHARACTER_FILE_SIZE} bytes`)
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const c = new Cursor(view)
  const record: CharacterRecord = {
    version: c.i16(),
    verify1: c.i16(),
    tohit: c.i16(),
    dodge: c.i16(),
    missile: c.i16(),
    twohand: c.i16(),
    traiter: c.i16(),
    normattacks: c.i16(),
    beenattacked: c.i16(),
    guarding: c.i16(),
    target: c.i16(),
    numitems: c.i16(),
    weaponsound: c.i16(),
    underneath: c.i16(),
    face: c.i16(),
    attackbonus: c.i16(),
    magco: c.i16(),
    position: c.i16(),
    maglu: c.i16(),
    magst: c.i16(),
    magres: c.i16(),
    movebonus: c.i16(),
    ac: c.i16(),
    damage: c.i16(),
    race: c.i16(),
    caste: c.i16(),
    spellcastertype: c.i16(),
    gender: c.i16(),
    level: c.i16(),
    movement: c.i16(),
    movementmax: c.i16(),
    attacks: c.i16(),
    nspells: readI16Array(c, SPELL_LEVELS),
    stamina: c.i16(),
    staminamax: c.i16(),
    pictid: c.i16(),
    iconid: c.i16(),
    spellpoints: c.i16(),
    spellpointsmax: c.i16(),
    nohands: c.i16(),
    weaponnum: c.i16(),
    missilenum: c.i16(),
    handtohand: c.i16(),
    condition: readI16Array(c, CONDITION_COUNT),
    special: readI16Array(c, SPECIAL_COUNT),
    armor: readI16Array(c, 20),
    spec: readI16Array(c, SPEC_COUNT),
    save: readI16Array(c, SAVE_COUNT),
    currentagegroup: c.i16(),
    verify2: c.i16(),
    items: readItems(c),
    scrollcase: readScrollcase(c),
    age: c.i32(),
    exp: c.i32(),
    load: c.u16(),
    loadmax: c.u16(),
    money: [c.u16(), c.u16(), c.u16()],
    hasturned: c.u8(),
    canheal: c.u8(),
    canidentify: c.u8(),
    candetect: c.u8(),
    toggle: c.u8(),
    bleeding: c.u8(),
    inbattle: c.u8(),
    st: c.i8(),
    in: c.i8(),
    wi: c.i8(),
    de: c.i8(),
    co: c.i8(),
    lu: c.i8(),
    cspells: Array.from({ length: SPELL_LEVELS }, () =>
      Array.from({ length: SPELLS_PER_LEVEL }, () => c.u8()),
    ),
    name: '',
    nameBytes: c.bytes(30),
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
    definespells: [],
    maxspellsattacks: 0,
    spellsofar: 0,
    spare: [],
  }
  record.name = decodeMacRoman(record.nameBytes)
  c.align2()
  record.verify3 = c.i16()
  record.damagetaken = c.i32()
  record.damagegiven = c.i32()
  record.hitsgiven = c.i32()
  record.hitstaken = c.i32()
  record.imissed = c.i32()
  record.umissed = c.i32()
  record.kills = c.i32()
  record.deaths = c.i32()
  record.knockouts = c.i32()
  record.spellscast = c.i32()
  record.destroyed = c.i32()
  record.turns = c.i32()
  record.prestigepenelty = c.i32()
  record.definespells = Array.from({ length: DEFINE_SPELL_ROWS }, () => readI16Array(c, 4))
  record.maxspellsattacks = c.i16()
  record.spellsofar = c.i16()
  record.spare = c.bytes(96)

  if (c.offset !== CHARACTER_FILE_SIZE) {
    throw new Error(`Character parser ended at ${c.offset}, expected ${CHARACTER_FILE_SIZE}`)
  }

  return { fileName, originalBytes: new Uint8Array(bytes), record }
}

export function serializeCharacterFile(file: CharacterFile): Uint8Array {
  const bytes = new Uint8Array(file.originalBytes)
  const view = new DataView(bytes.buffer)
  const r = file.record
  let o = 0
  const wi16 = (value: number) => {
    writeI16(view, o, value)
    o += 2
  }
  const wu16 = (value: number) => {
    writeU16(view, o, value)
    o += 2
  }
  const wi32 = (value: number) => {
    writeI32(view, o, value)
    o += 4
  }
  const wu8 = (value: number) => {
    writeU8(view, o, value)
    o += 1
  }
  const wi8 = (value: number) => {
    writeI8(view, o, value)
    o += 1
  }
  const i16s = (values: number[]) => values.forEach(wi16)

  ;[
    r.version, r.verify1, r.tohit, r.dodge, r.missile, r.twohand, r.traiter, r.normattacks,
    r.beenattacked, r.guarding, r.target, r.numitems, r.weaponsound, r.underneath, r.face,
    r.attackbonus, r.magco, r.position, r.maglu, r.magst, r.magres, r.movebonus, r.ac,
    r.damage, r.race, r.caste, r.spellcastertype, r.gender, r.level, r.movement, r.movementmax,
    r.attacks,
  ].forEach(wi16)
  i16s(r.nspells)
  ;[
    r.stamina, r.staminamax, r.pictid, r.iconid, r.spellpoints, r.spellpointsmax, r.nohands,
    r.weaponnum, r.missilenum, r.handtohand,
  ].forEach(wi16)
  i16s(r.condition)
  i16s(r.special)
  i16s(r.armor)
  i16s(r.spec)
  i16s(r.save)
  wi16(r.currentagegroup)
  wi16(r.verify2)
  r.items.forEach((item) => {
    wi16(item.id)
    wu8(item.equip)
    wu8(item.ident)
    wi16(item.charge)
  })
  r.scrollcase.forEach((scroll) => {
    wi8(scroll.castcaste)
    wi8(scroll.castlevel)
    wi8(scroll.castnum)
    wi8(scroll.powerlevel)
  })
  wi32(r.age)
  wi32(r.exp)
  wu16(r.load)
  wu16(r.loadmax)
  r.money.forEach(wu16)
  ;[r.hasturned, r.canheal, r.canidentify, r.candetect, r.toggle, r.bleeding, r.inbattle].forEach(wu8)
  ;[r.st, r.in, r.wi, r.de, r.co, r.lu].forEach(wi8)
  r.cspells.forEach((level) => level.forEach(wu8))
  const nameBytes = nameBytesForSerialize(r)
  nameBytes.forEach(wu8)
  if (o % 2 !== 0) {
    o += 1
  }
  wi16(r.verify3)
  ;[
    r.damagetaken, r.damagegiven, r.hitsgiven, r.hitstaken, r.imissed, r.umissed, r.kills,
    r.deaths, r.knockouts, r.spellscast, r.destroyed, r.turns, r.prestigepenelty,
  ].forEach(wi32)
  r.definespells.forEach(i16s)
  wi16(r.maxspellsattacks)
  wi16(r.spellsofar)
  r.spare.slice(0, 96).forEach(wu8)
  if (o !== CHARACTER_FILE_SIZE) {
    throw new Error(`Character serializer ended at ${o}, expected ${CHARACTER_FILE_SIZE}`)
  }
  return bytes
}

export function cloneCharacterFile(file: CharacterFile): CharacterFile {
  return {
    fileName: file.fileName,
    originalBytes: new Uint8Array(file.originalBytes),
    record: structuredClone(file.record),
  }
}

export function characterDownloadName(record: CharacterRecord): string {
  const safe = record.name.trim() || 'Realmz Character'
  return safe.replace(/[\\/:]/g, '_')
}

export function validateCharacterName(name: string): string[] {
  const errors: string[] = []
  let bytes: number[] = []
  try {
    bytes = encodeMacRoman(name)
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'character name contains unsupported characters')
  }
  if (name.length === 0) {
    errors.push('character name is empty')
  }
  if (bytes.length > 28) {
    errors.push('character name is longer than 28 bytes')
  }
  for (const byte of bytes) {
    if (byte < 0x20 || byte === 0x3a || byte === 0x2f || byte === 0x5c) {
      errors.push('character name contains a path separator or control character')
      break
    }
  }
  return errors
}

export function encodePaddedName(name: string): number[] {
  const errors = validateCharacterName(name)
  if (errors.length) {
    throw new Error(errors[0])
  }
  const bytes = encodeMacRoman(name)
  return [...bytes, ...Array.from({ length: 30 - bytes.length }, () => 0)].slice(0, 30)
}

function nameBytesForSerialize(record: CharacterRecord): number[] {
  if (decodeMacRoman(record.nameBytes) === record.name && record.nameBytes.length === 30) {
    return [...record.nameBytes]
  }
  return encodePaddedName(record.name)
}

export function expectedVerify1(record: CharacterRecord): number {
  return clampSigned(record.level + record.staminamax + record.attackbonus, -32768, 32767)
}

export function expectedVerify2(record: CharacterRecord): number {
  return clampSigned(record.tohit + record.spellpointsmax + record.st + record.in, -32768, 32767)
}

export function expectedVerify3(record: CharacterRecord): number {
  return clampSigned(record.ac + record.staminamax + record.de + record.staminamax + record.magres, -32768, 32767)
}

export function refreshVerification(record: CharacterRecord): void {
  record.verify1 = expectedVerify1(record)
  record.verify2 = expectedVerify2(record)
  record.verify3 = expectedVerify3(record)
}

export function validateCharacter(record: CharacterRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (record.version !== -3 && record.version !== -4) {
    issues.push({ severity: 'error', message: 'unsupported character version' })
  }
  validateCharacterName(record.name).forEach((message) => issues.push({ severity: 'error', message }))
  if (record.numitems < 0 || record.numitems > MAX_ITEMS) {
    issues.push({ severity: 'error', message: 'item count is outside the character inventory range' })
  }
  if (record.level < 0 || record.level > 1000) {
    issues.push({ severity: 'error', message: 'level is outside the expected editor range' })
  }
  if (record.verify1 !== expectedVerify1(record)) {
    issues.push({ severity: 'error', message: 'verify1 does not match editable stats' })
  }
  if (record.verify2 !== expectedVerify2(record)) {
    issues.push({ severity: 'error', message: 'verify2 does not match editable stats' })
  }
  if (record.verify3 !== expectedVerify3(record)) {
    issues.push({ severity: 'error', message: 'verify3 does not match editable stats' })
  }
  if (record.spellcastertype < 0 || record.spellcastertype > 5) {
    issues.push({ severity: 'error', message: 'spellcaster type is outside the expected range' })
  }
  if (record.spellpoints < 0 || record.spellpointsmax < 0) {
    issues.push({ severity: 'error', message: 'spell points cannot be negative' })
  }
  if (record.spellpointsmax === 0 && record.spellpoints !== 0) {
    issues.push({ severity: 'error', message: 'current spell points require a nonzero spell point max' })
  }
  if (record.spellpoints > record.spellpointsmax) {
    issues.push({ severity: 'error', message: 'current spell points cannot exceed spell point max' })
  }
  if (record.spellpointsmax > 0 && record.spellcastertype === 0) {
    issues.push({ severity: 'error', message: 'spell points require a spellcaster type' })
  }
  for (let i = 0; i < Math.min(record.numitems, MAX_ITEMS); i++) {
    if (record.items[i].id === 0) {
      issues.push({ severity: 'error', message: 'inventory contains an empty item before the item count' })
      break
    }
    if (!itemById(record.items[i].id)) {
      issues.push({ severity: 'error', message: `inventory item ${record.items[i].id} is not in the base catalog` })
      break
    }
  }
  return issues
}

export const CHARACTER_OFFSETS = {
  items: 292,
  itemSize: ITEM_SIZE,
  scrollcase: 472,
  scrollSize: SCROLL_SIZE,
  verify3: 638,
}
