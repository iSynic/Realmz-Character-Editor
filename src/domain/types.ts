export const CHARACTER_FILE_SIZE = 872
export const MAX_ITEMS = 30
export const CONDITION_COUNT = 40
export const SPECIAL_COUNT = 12
export const SPEC_COUNT = 15
export const SAVE_COUNT = 8
export const SPELL_LEVELS = 7
export const SPELLS_PER_LEVEL = 12
export const DEFINE_SPELL_ROWS = 10

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: ValidationSeverity
  message: string
}

export interface ItemEntry {
  id: number
  equip: number
  ident: number
  charge: number
}

export interface ScrollEntry {
  castcaste: number
  castlevel: number
  castnum: number
  powerlevel: number
}

export interface CharacterRecord {
  version: number
  verify1: number
  tohit: number
  dodge: number
  missile: number
  twohand: number
  traiter: number
  normattacks: number
  beenattacked: number
  guarding: number
  target: number
  numitems: number
  weaponsound: number
  underneath: number
  face: number
  attackbonus: number
  magco: number
  position: number
  maglu: number
  magst: number
  magres: number
  movebonus: number
  ac: number
  damage: number
  race: number
  caste: number
  spellcastertype: number
  gender: number
  level: number
  movement: number
  movementmax: number
  attacks: number
  nspells: number[]
  stamina: number
  staminamax: number
  pictid: number
  iconid: number
  spellpoints: number
  spellpointsmax: number
  nohands: number
  weaponnum: number
  missilenum: number
  handtohand: number
  condition: number[]
  special: number[]
  armor: number[]
  spec: number[]
  save: number[]
  currentagegroup: number
  verify2: number
  items: ItemEntry[]
  scrollcase: ScrollEntry[]
  age: number
  exp: number
  load: number
  loadmax: number
  money: number[]
  hasturned: number
  canheal: number
  canidentify: number
  candetect: number
  toggle: number
  bleeding: number
  inbattle: number
  st: number
  in: number
  wi: number
  de: number
  co: number
  lu: number
  cspells: number[][]
  name: string
  nameBytes: number[]
  verify3: number
  damagetaken: number
  damagegiven: number
  hitsgiven: number
  hitstaken: number
  imissed: number
  umissed: number
  kills: number
  deaths: number
  knockouts: number
  spellscast: number
  destroyed: number
  turns: number
  prestigepenelty: number
  definespells: number[][]
  maxspellsattacks: number
  spellsofar: number
  spare: number[]
}

export interface CharacterFile {
  fileName: string
  originalBytes: Uint8Array
  record: CharacterRecord
}

export type ItemCategoryId = 'weapons' | 'armor' | 'shields' | 'magic' | 'misc'

export interface ItemMetadata {
  id: number
  category: ItemCategoryId
  name: string
  unidentifiedName: string
  description: string
  iconId: number
  displayIconId: number
  unidentifiedIconId: number
  type: number
  charge: number
  weight: number
  damage: number
  ac: number
  magres: number
  spellpoints: number
  nohands: number
  xcharge: number
  drop: number
}

export interface NamedId {
  id: number
  name: string
}

export interface SpellMetadata {
  casterType: number
  level: number
  index: number
  name: string
  special: number
}

export interface RaceProfile {
  id: number
  name: string
  numOfAttacks: number[]
}

export interface CasteProfile {
  id: number
  name: string
  specialAbilityLevelGains: number[]
  spellcasters: number[][]
  conditions: number[]
  stamina: number[]
  dodge: number[]
  tohit: number[]
  missile: number[]
  hand2hand: number[]
  maxStaminaBonus: number
  bonusAttacks: number
  victory: number[]
  attacks: number[]
}

export interface RealmzMetadata {
  generatedAt: string
  sourceRoot: string
  items: ItemMetadata[]
  raceProfiles: RaceProfile[]
  casteProfiles: CasteProfile[]
  races: NamedId[]
  castes: NamedId[]
  genders: NamedId[]
  spellcasters: NamedId[]
  spells: SpellMetadata[]
  conditions: string[]
  specials: string[]
  specs: string[]
  saves: string[]
  portraits: NamedId[]
  combatIcons: NamedId[]
}
