import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const workspaceRoot = process.cwd()
const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const outJson = path.join(workspaceRoot, 'src', 'generated', 'realmzMetadata.json')
const assetRoot = path.join(workspaceRoot, 'public', 'realmz-assets')
const dataRoot = path.join(realmzRoot, 'out_win_clang')
const sourceDataRoot = path.join(realmzRoot, 'base', 'Realmz')
const nativeRoot = path.join(workspaceRoot, 'tools', 'realmz-asset-extractor', 'native')
const nativeBuildRoot = path.join(nativeRoot, 'build')
const nativeExtractor = path.join(nativeBuildRoot, process.platform === 'win32' ? 'extract-realmz-assets.exe' : 'extract-realmz-assets')
const nativeCacheRoot = path.join(workspaceRoot, 'tools', 'realmz-asset-extractor', '.cache')
const depsPrefix = process.env.REALMZ_DEPS_PREFIX ?? 'F:\\Realmz-deps\\install-clang'
const nativePathEntries = [
  path.join(depsPrefix, 'bin'),
  path.join(realmzRoot, 'build_win_clang'),
  'C:\\msys64\\clang64\\bin',
  'C:\\msys64\\mingw64\\bin',
]

const itemCategories = [
  ['weapons', 0, 'Weapon'],
  ['armor', 200, 'Armor'],
  ['shields', 400, 'Shield'],
  ['magic', 600, 'Magic'],
  ['misc', 800, 'Misc'],
]

const lookupIconTable = [
  [1, 10, 2],
  [12, 19, 12],
  [20, 34, 20],
  [35, 39, 35],
  [50, 56, 50],
  [82, 85, 82],
  [89, 95, 89],
  [517, 527, 527],
  [545, 548, 546],
  [6100, 6109, 6100],
  [6110, 6121, 6110],
  [6122, 6127, 6122],
  [6137, 6139, 6137],
  [6185, 6187, 6183],
  [6190, 6195, 6190],
  [6196, 6200, 6197],
  [6202, 6206, 6202],
  [6208, 6209, 12009],
  [6162, 6163, 6162],
  [6176, 6177, 6177],
]

const saveNames = [
  'Charm Save',
  'Heat Save',
  'Cold Save',
  'Electric Save',
  'Chemical Save',
  'Mental Save',
  'Energy Save',
  'Special Save',
]

const specialFallbacks = [
  'Vs. magic creatures',
  'Vs. undead creatures',
  'Vs. demonic/devil creatures',
  'Vs. reptilian creatures',
  'Vs. very evil creatures',
  'Vs. intelligent creatures',
  'Vs. giant sized creatures',
  'Vs. non-humanoid creatures',
  'Special 9',
  'Special 10',
  'Special 11',
  'Special 12',
]

const conditionFallbacks = [
  'In Retreat',
  'Is Helpless',
  'Entangled',
  'Cursed',
  'Magic Aura',
  'Stupid',
  'Moving Slowly',
  'Shielded from Hits',
  'Missile Shield',
  'Poisoned',
  'Regenerating',
  'Fire Protection',
  'Cold Protection',
  'Electrical Protection',
  'Chemical Protection',
  'Psi Protection',
  "Pro' First Level",
  "Pro' Second Level",
  "Pro' Third Level",
  "Pro' Fourth Level",
  "Pro' Fifth Level",
  'Strong',
  "Pro' from Foe",
  'Speedy',
  'Invisible',
  'Animated',
  'Turned to Stone',
  'Blind',
  'Is Diseased',
  'Confused',
  'Reflecting Spells',
  'Reflecting Attacks',
  'Bonus Damage',
  'Absorbing Energy',
  'Losing Energy',
  'Absorbing Spell Energy',
  'Hindered Attacks',
  'Hindered Defense',
  'Increased Defense',
  'Silenced',
]

const specNames = [
  'Sneak Attack',
  'Hide In Shadows',
  'Resurrect',
  'Major Wound',
  'Detect Secret',
  'Acrobatic Act',
  'Detect Trap',
  'Disarm Trap',
  'Hear Noise',
  'Force Door',
  'Move Silently',
  'Pick Lock',
  'Special Skill 13',
  'Turn Undead',
  'Special Skill 15',
]

const spellcasterNames = [
  [0, 'None'],
  [1, 'Sorcerer/Enchanter'],
  [2, 'Priest'],
  [3, 'Specialist Caster'],
  [4, 'Custom Caster'],
  [5, 'Custom Caster'],
]

function readFileAny(...paths) {
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath)
    }
  }
  throw new Error(`None of these paths exist: ${paths.join(', ')}`)
}

function i16(data, offset) {
  return data.readInt16BE(offset)
}

function i32(data, offset) {
  return data.readInt32BE(offset)
}

function resourceType(text) {
  return Buffer.from(text, 'ascii').readUInt32BE(0)
}

function decodeMacRoman(buffer) {
  let out = ''
  for (const byte of buffer) {
    if (byte === 0) break
    if (byte < 0x80) out += String.fromCharCode(byte)
    else out += '?'
  }
  return out
}

function parseResourceFork(filePath) {
  if (!fs.existsSync(filePath)) {
    return []
  }
  const data = fs.readFileSync(filePath)
  if (data.length < 256) {
    return []
  }
  const dataOffset = data.readUInt32BE(0)
  const mapOffset = data.readUInt32BE(4)
  const dataLength = data.readUInt32BE(8)
  const mapLength = data.readUInt32BE(12)
  if (dataOffset <= 0 || mapOffset <= 0 || dataOffset + dataLength > data.length || mapOffset + mapLength > data.length) {
    return []
  }
  const typeListOffset = data.readUInt16BE(mapOffset + 24)
  const nameListOffset = data.readUInt16BE(mapOffset + 26)
  const typeListBase = mapOffset + typeListOffset
  const nameListBase = mapOffset + nameListOffset
  const typeCount = data.readUInt16BE(typeListBase) + 1
  const resources = []
  for (let t = 0; t < typeCount; t++) {
    const typeRecord = typeListBase + 2 + t * 8
    const type = data.readUInt32BE(typeRecord)
    const count = data.readUInt16BE(typeRecord + 4) + 1
    const refOffset = data.readUInt16BE(typeRecord + 6)
    const refBase = typeListBase + refOffset
    for (let r = 0; r < count; r++) {
      const ref = refBase + r * 12
      const id = data.readInt16BE(ref)
      const nameOffset = data.readInt16BE(ref + 2)
      const dataRel = ((data[ref + 5] << 16) | (data[ref + 6] << 8) | data[ref + 7]) >>> 0
      const body = dataOffset + dataRel
      if (body + 4 > data.length) {
        continue
      }
      const bodyLength = data.readUInt32BE(body)
      if (body + 4 + bodyLength > data.length) {
        continue
      }
      let name = ''
      if (nameOffset >= 0) {
        const nameAt = nameListBase + nameOffset
        const nameLength = data[nameAt]
        name = decodeMacRoman(data.subarray(nameAt + 1, nameAt + 1 + nameLength))
      }
      resources.push({
        type,
        id,
        name,
        data: data.subarray(body + 4, body + 4 + bodyLength),
      })
    }
  }
  return resources
}

function parseStrResources(paths) {
  const strings = new Map()
  for (const filePath of paths) {
    for (const res of parseResourceFork(filePath)) {
      if (res.type !== resourceType('STR#') || res.data.length < 2) {
        continue
      }
      const count = res.data.readUInt16BE(0)
      let offset = 2
      const values = []
      for (let i = 0; i < count && offset < res.data.length; i++) {
        const len = res.data[offset]
        offset += 1
        values.push(decodeMacRoman(res.data.subarray(offset, offset + len)))
        offset += len
      }
      strings.set(res.id, values)
    }
  }
  return strings
}

function str(strings, id, index, fallback) {
  const value = strings.get(id)?.[index - 1]
  return value && value.trim() ? value : fallback
}

function itemAttr(data, offset) {
  return {
    st: i16(data, offset),
    itemid: i16(data, offset + 2),
    iconid: i16(data, offset + 4),
    type: i16(data, offset + 6),
    blunt: i16(data, offset + 8),
    nohands: i16(data, offset + 10),
    lu: i16(data, offset + 12),
    movement: i16(data, offset + 14),
    ac: i16(data, offset + 16),
    magres: i16(data, offset + 18),
    damage: i16(data, offset + 20),
    spellpoints: i16(data, offset + 22),
    sound: i16(data, offset + 24),
    weight: i16(data, offset + 26),
    cost: i16(data, offset + 28),
    charge: i16(data, offset + 30),
    iscurse: i16(data, offset + 32),
    ismagical: i16(data, offset + 34),
    itemcat0: i32(data, offset + 36),
    itemcat1: i32(data, offset + 40),
    xcharge: i16(data, offset + 96),
    drop: i16(data, offset + 98),
  }
}

function itemName(strings, id, identified, fallback) {
  if (id <= 0) return '(empty)'
  const base = Math.trunc(Math.abs(id) / 200) * 200
  const listId = base + (identified ? 1 : 0)
  return str(strings, listId, Math.abs(id) - base + 1, fallback)
}

function itemDescription(strings, id, fallback) {
  const base = Math.trunc(Math.abs(id) / 200) * 200
  return str(strings, base + 2, Math.abs(id) - base + 1, fallback)
}

function lookupIcon(iconId, identified) {
  if (identified || iconId <= 0) {
    return iconId
  }
  for (const [first, last, generic] of lookupIconTable) {
    if (iconId >= first && iconId <= last) {
      return generic
    }
  }
  return iconId
}

function parseItems(strings) {
  const dataId = readFileAny(
    path.join(dataRoot, 'Data Files', 'Data ID'),
    path.join(sourceDataRoot, 'Data Files', 'Data ID'),
  )
  const supply = readFileAny(
    path.join(dataRoot, 'Scenarios', 'City of Bywater', 'Data NI'),
    path.join(sourceDataRoot, 'Scenarios', 'City of Bywater', 'Data NI'),
  )
  const items = []
  for (const [category, base, label] of itemCategories) {
    const source = category === 'misc' ? supply : dataId
    const tableIndex = category === 'misc' ? 0 : base / 200
    const tableOffset = tableIndex * 200 * 100
    for (let i = 0; i < 200; i++) {
      const attr = itemAttr(source, tableOffset + i * 100)
      if (attr.itemid === 0) {
        continue
      }
      const id = attr.itemid || base + i
      items.push({
        id,
        category,
        name: itemName(strings, id, true, `${label} ${id}`),
        unidentifiedName: itemName(strings, id, false, `Unidentified ${label} ${id}`),
        description: itemDescription(strings, id, 'No description text is available for this item.'),
        iconId: attr.iconid,
        displayIconId: lookupIcon(attr.iconid, true),
        unidentifiedIconId: lookupIcon(attr.iconid, false),
        type: attr.type,
        charge: attr.charge,
        weight: attr.weight,
        damage: attr.damage,
        ac: attr.ac,
        magres: attr.magres,
        spellpoints: attr.spellpoints,
        nohands: attr.nohands,
        xcharge: attr.xcharge,
        drop: attr.drop,
      })
    }
  }
  return items.sort((a, b) => a.id - b.id)
}

function parseSpells(strings) {
  const data = readFileAny(
    path.join(dataRoot, 'Data Files', 'Data S'),
    path.join(sourceDataRoot, 'Data Files', 'Data S'),
  )
  const spells = []
  for (let caster = 1; caster <= 5; caster++) {
    for (let level = 0; level < 7; level++) {
      for (let index = 0; index < 12; index++) {
        const sequential = (caster - 1) * 7 * 15 + level * 15 + index
        const offset = sequential * 30
        spells.push({
          casterType: caster,
          level,
          index,
          name: str(strings, 1000 * caster + level, index + 1, `Spell ${level + 1}-${index + 1}`),
          special: data[offset + 25] ?? 0,
        })
      }
    }
  }
  return spells
}

function ensureNativeExtractor() {
  if (fs.existsSync(nativeExtractor)) {
    return
  }
  if (!fs.existsSync(depsPrefix)) {
    throw new Error(`Realmz dependency prefix not found: ${depsPrefix}`)
  }

  fs.mkdirSync(nativeBuildRoot, { recursive: true })
  const cmake = process.env.CMAKE ?? 'cmake'
  const configureArgs = [
    '-S',
    nativeRoot,
    '-B',
    nativeBuildRoot,
    '-DCMAKE_BUILD_TYPE=Release',
    `-DCMAKE_PREFIX_PATH=${depsPrefix}`,
  ]

  if (process.platform === 'win32') {
    configureArgs.push(
      '-G',
      'Ninja',
      '-DCMAKE_CXX_COMPILER=C:/msys64/clang64/bin/clang++.exe',
      '-DCMAKE_MAKE_PROGRAM=C:/msys64/mingw64/bin/ninja.exe',
    )
  }

  execFileSync(cmake, configureArgs, { stdio: 'inherit' })
  execFileSync(cmake, ['--build', nativeBuildRoot, '--config', 'Release'], { stdio: 'inherit' })
}

function writeIds(name, ids) {
  fs.mkdirSync(nativeCacheRoot, { recursive: true })
  const file = path.join(nativeCacheRoot, `${name}.txt`)
  fs.writeFileSync(file, `${Array.from(ids).sort((a, b) => a - b).join('\n')}\n`)
  return file
}

function existingPaths(paths) {
  return paths.filter((resourcePath) => fs.existsSync(resourcePath))
}

function extractAssetSet(outDir, ids, resourcePaths) {
  if (ids.size === 0) {
    fs.mkdirSync(outDir, { recursive: true })
    return
  }
  const idFile = writeIds(path.basename(outDir), ids)
  const sources = existingPaths(resourcePaths)
  if (sources.length === 0) {
    throw new Error(`No resource files found for ${outDir}`)
  }
  execFileSync(nativeExtractor, [outDir, idFile, ...sources], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${nativePathEntries.filter((entry) => fs.existsSync(entry)).join(path.delimiter)}${path.delimiter}${process.env.PATH ?? ''}`,
    },
  })
}

function ensureAssets(metadata) {
  ensureNativeExtractor()
  fs.rmSync(assetRoot, { recursive: true, force: true })
  fs.mkdirSync(assetRoot, { recursive: true })
  const iconDir = path.join(assetRoot, 'icons')
  const portraitDir = path.join(assetRoot, 'portraits')
  const combatDir = path.join(assetRoot, 'combat')

  const itemIconIds = new Set()
  for (const item of metadata.items) {
    for (const id of [item.displayIconId, item.unidentifiedIconId]) {
      if (id > 0) {
        itemIconIds.add(id)
      }
    }
  }
  const portraitIds = new Set(metadata.portraits.map((entry) => entry.id))
  const combatIds = new Set(metadata.combatIcons.map((entry) => entry.id))

  const itemSources = [
    path.join(dataRoot, 'Data Files', 'Data ID.rsrc'),
    path.join(dataRoot, 'Data Files', 'Portraits.rsrc'),
    path.join(dataRoot, 'Data Files', 'Tacticals.rsrc'),
    path.join(dataRoot, 'Data Files', 'The Family Jewels.rsrc'),
    path.join(dataRoot, 'Data PC', 'Character Editor Resources.rsf'),
    path.join(dataRoot, 'Scenarios', 'City of Bywater', 'Scenario.rsrc'),
    path.join(realmzRoot, 'resources', 'realmz.rsrc'),
    path.join(sourceDataRoot, 'Data Files', 'Data ID.rsrc'),
    path.join(sourceDataRoot, 'Data Files', 'The Family Jewels.rsrc'),
    path.join(sourceDataRoot, 'Scenarios', 'City of Bywater', 'Scenario.rsrc'),
  ]

  extractAssetSet(iconDir, itemIconIds, itemSources)
  extractAssetSet(portraitDir, portraitIds, [
    path.join(dataRoot, 'Data Files', 'Portraits.rsrc'),
    path.join(sourceDataRoot, 'Data Files', 'Portraits.rsrc'),
  ])
  extractAssetSet(combatDir, combatIds, [
    path.join(dataRoot, 'Data Files', 'Tacticals.rsrc'),
    path.join(sourceDataRoot, 'Data Files', 'Tacticals.rsrc'),
  ])
}

const resourcePaths = [
  path.join(dataRoot, 'Data Files', 'Data ID.rsrc'),
  path.join(dataRoot, 'Data Files', 'Data Race.rsrc'),
  path.join(dataRoot, 'Data Files', 'Data Caste.rsrc'),
  path.join(dataRoot, 'Data Files', 'Data S.rsrc'),
  path.join(dataRoot, 'Data Files', 'Custom Names.rsrc'),
  path.join(dataRoot, 'Data PC', 'Character Editor Resources.rsf'),
  path.join(dataRoot, 'Data PC', 'realmz.rsrc.rsf'),
  path.join(realmzRoot, 'resources', 'realmz.rsrc'),
]

const strings = parseStrResources(resourcePaths)
const metadata = {
  generatedAt: new Date().toISOString(),
  sourceRoot: realmzRoot,
  items: parseItems(strings),
  races: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: str(strings, 129, i + 1, `Race ${i + 1}`) })),
  castes: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: str(strings, 131, i + 1, `Caste ${i + 1}`) })),
  genders: [
    { id: 1, name: 'Male' },
    { id: 2, name: 'Female' },
  ],
  spellcasters: spellcasterNames.map(([id, name]) => ({ id, name })),
  spells: parseSpells(strings),
  conditions: Array.from({ length: 40 }, (_, i) => str(strings, 133, i + 1, conditionFallbacks[i])),
  specials: Array.from({ length: 12 }, (_, i) => str(strings, 132, i + 1, specialFallbacks[i])),
  specs: specNames,
  saves: saveNames,
  portraits: Array.from({ length: 120 }, (_, i) => ({ id: 257 + i, name: `Portrait ${257 + i}` })),
  combatIcons: Array.from({ length: 120 }, (_, i) => ({ id: 9000 + i, name: `Combat Icon ${9000 + i}` })),
}

fs.mkdirSync(path.dirname(outJson), { recursive: true })
fs.writeFileSync(outJson, `${JSON.stringify(metadata, null, 2)}\n`)
ensureAssets(metadata)
console.log(`Generated ${outJson}`)
console.log(`Generated assets in ${assetRoot}`)
