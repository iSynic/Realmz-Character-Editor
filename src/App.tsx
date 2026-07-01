import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import './App.css'
import {
  characterDownloadName,
  clampSigned,
  parseCharacterFile,
  serializeCharacterFile,
  validateCharacter,
} from './domain/characterFile'
import {
  addItem,
  applyCharacterMutation,
  activeSpellProgression,
  clearBadEffects,
  isBadConditionValue,
  levelUpCharacter,
  moveItem,
  pairedCombatIconForPortrait,
  removeItem,
  spellProgressionForRecord,
  setSpellpointsCurrent,
  setSpellpointsMax,
  type LevelUpResult,
} from './domain/editorLogic'
import { canCharacterUseItem, itemById, itemName, itemsForCategory, labelFor, metadata, spellFor } from './domain/metadata'
import type { CharacterFile, CharacterRecord, ItemCategoryId, ItemMetadata, ValidationIssue } from './domain/types'

type TabId = 'core' | 'spells' | 'conditions' | 'abilities' | 'items' | 'appearance'
type UpdateRecord = (mutate: (draft: CharacterRecord) => void) => void
type StatKey = 'st' | 'in' | 'wi' | 'de' | 'co' | 'lu'
type CounterKey =
  | 'exp'
  | 'damagetaken'
  | 'damagegiven'
  | 'hitsgiven'
  | 'hitstaken'
  | 'imissed'
  | 'umissed'
  | 'kills'
  | 'deaths'
  | 'knockouts'
  | 'spellscast'
  | 'destroyed'
  | 'turns'
  | 'prestigepenelty'

const tabs: { id: TabId; label: string }[] = [
  { id: 'core', label: 'Core' },
  { id: 'spells', label: 'Spells' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'items', label: 'Items' },
  { id: 'appearance', label: 'Appearance' },
]

const statFields: { key: StatKey; label: string }[] = [
  { key: 'st', label: 'Brawn' },
  { key: 'in', label: 'Knowledge' },
  { key: 'wi', label: 'Judgment' },
  { key: 'de', label: 'Agility' },
  { key: 'co', label: 'Vitality' },
  { key: 'lu', label: 'Luck' },
]

const counterFields: { key: CounterKey; label: string; min: number; max: number }[] = [
  { key: 'exp', label: 'Victory Pts', min: -2147483648, max: 2147483647 },
  { key: 'damagetaken', label: 'Damage Taken', min: 0, max: 2147483647 },
  { key: 'damagegiven', label: 'Damage Given', min: 0, max: 2147483647 },
  { key: 'hitsgiven', label: 'Hits Given', min: 0, max: 2147483647 },
  { key: 'hitstaken', label: 'Hits Taken', min: 0, max: 2147483647 },
  { key: 'imissed', label: 'Missed', min: 0, max: 2147483647 },
  { key: 'umissed', label: 'Dodged', min: 0, max: 2147483647 },
  { key: 'kills', label: 'Kills', min: 0, max: 2147483647 },
  { key: 'deaths', label: 'Deaths', min: 0, max: 2147483647 },
  { key: 'knockouts', label: 'Knockouts', min: 0, max: 2147483647 },
  { key: 'spellscast', label: 'Spells Cast', min: 0, max: 2147483647 },
  { key: 'destroyed', label: 'Destroyed', min: 0, max: 2147483647 },
  { key: 'turns', label: 'Turns', min: 0, max: 2147483647 },
  { key: 'prestigepenelty', label: 'Prestige Penalty', min: 0, max: 2147483647 },
]

const itemCategoryLabels: { id: ItemCategoryId; label: string }[] = [
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'shields', label: 'Shields' },
  { id: 'magic', label: 'Magic' },
  { id: 'misc', label: 'Misc' },
]

const catalogDragType = 'application/x-realmz-catalog-item'
const inventoryDragType = 'application/x-realmz-inventory-index'

const conditionDisplayLabels = [
  'In Retreat',
  'Is Helpless',
  'Entangled',
  'Cursed',
  'Magic Aura',
  'Stupid',
  'Moving Slowly',
  'Shielded from normal attacks',
  'Shielded from projectiles',
  'Poisoned',
  'Regenerating',
  'Protection from heat attacks',
  'Protection from cold attacks',
  'Protection from electrical attacks',
  'Protection from chemical attacks',
  'Protection from mental attacks',
  'Protection from 1st level spells',
  'Protection from 2nd level spells',
  'Protection from 3rd level spells',
  'Protection from 4th level spells',
  'Protection from 5th level spells',
  'Strong',
  'Protection from foe',
  'Speedy',
  'Invisible',
  'Animated',
  'Turned to stone',
  'Blind',
  'Is Diseased',
  'Confused',
  'Reflecting Spells',
  'Reflecting Attacks',
  'Attack bonus',
  'Absorb Energy',
  'Losing Energy',
  'Absorbs spell energy from attacks',
  'Hindered Attacks',
  'Hindered Defense',
  'Defensive bonus',
  'Silenced',
]

function realmzAsset(path: string): string {
  return `${import.meta.env.BASE_URL}realmz-assets/${path}`
}

function App() {
  const [characterFile, setCharacterFile] = useState<CharacterFile | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('core')
  const [message, setMessage] = useState('Upload a Realmz character file to begin.')
  const [spellLevel, setSpellLevel] = useState(0)
  const [itemCategory, setItemCategory] = useState<ItemCategoryId>('weapons')
  const [selectedInventory, setSelectedInventory] = useState(0)
  const [selectedCatalogId, setSelectedCatalogId] = useState<number | null>(null)
  const [catalogFilter, setCatalogFilter] = useState('')
  const [usableOnly, setUsableOnly] = useState(false)
  const [appearanceMode, setAppearanceMode] = useState<'portrait' | 'combat'>('portrait')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const record = characterFile?.record ?? null
  const issues = useMemo(() => (record ? validateCharacter(record) : []), [record])
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')

  const updateRecord: UpdateRecord = (mutate) => {
    if (!characterFile) {
      return
    }
    setCharacterFile({
      ...characterFile,
      record: applyCharacterMutation(characterFile.record, mutate),
    })
  }

  const levelUp = () => {
    const resultRef: { current: LevelUpResult | null } = { current: null }
    updateRecord((draft) => {
      resultRef.current = levelUpCharacter(draft)
    })
    const result = resultRef.current
    if (!result) {
      setMessage('Cannot level up without a valid race, caste, and level.')
      return
    }
    const details = [`+${result.staminaGain} stamina`]
    if (result.spellpointsGain) {
      details.push(`+${result.spellpointsGain} spell pts`)
    }
    if (result.magresGain) {
      details.push(`+${result.magresGain} magic resistance`)
    }
    if (result.victoryPointsSpent) {
      details.push(`${result.victoryPointsSpent} victory pts spent`)
    }
    setMessage(`Leveled ${record?.name ?? 'character'} to level ${result.level}: ${details.join(', ')}.`)
  }

  const clearBadConditionEffects = () => {
    let cleared = 0
    updateRecord((draft) => {
      cleared = clearBadEffects(draft)
    })
    setMessage(cleared ? `Cleared ${cleared} bad condition effect${cleared === 1 ? '' : 's'}.` : 'No bad condition effects to clear.')
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) {
      return
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parsed = parseCharacterFile(bytes, file.name)
      setCharacterFile(parsed)
      setActiveTab('core')
      setSelectedInventory(0)
      setMessage(`Opened ${parsed.record.name || file.name}.`)
    } catch (error) {
      setCharacterFile(null)
      setMessage(error instanceof Error ? error.message : 'Could not read that character file.')
    }
  }

  const download = () => {
    if (!characterFile || blockingIssues.length > 0) {
      return
    }
    const bytes = serializeCharacterFile(characterFile)
    const buffer = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(buffer).set(bytes)
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = characterDownloadName(characterFile.record)
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    setMessage(`Downloaded ${characterFile.record.name}.`)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Realmz Character Editor</h1>
          <p>{record ? `${record.name} - Level ${record.level}` : 'Browser-only binary editor'}</p>
        </div>
        <div className="top-actions">
          <input
            className="file-input"
            ref={fileInputRef}
            type="file"
            aria-label="Upload character file"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>Open</button>
          <button type="button" disabled={!record || blockingIssues.length > 0} onClick={download}>Download</button>
        </div>
      </header>

      <section className="status-strip">
        <span>{message}</span>
        <span>{record ? `${characterFile?.fileName} - ${characterFile?.originalBytes.length} bytes` : 'No file loaded'}</span>
      </section>

      {record ? (
        <div className="editor-layout">
          <aside className="summary-panel">
            <CharacterSummary record={record} issues={issues} />
          </aside>
          <section className="workspace">
            <nav className="tabs" aria-label="Editor sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={tab.id === activeTab ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            {activeTab === 'core' && <CoreTab record={record} updateRecord={updateRecord} levelUp={levelUp} />}
            {activeTab === 'spells' && (
              <SpellsTab record={record} spellLevel={spellLevel} setSpellLevel={setSpellLevel} updateRecord={updateRecord} />
            )}
            {activeTab === 'conditions' && <ConditionsTab record={record} updateRecord={updateRecord} clearBadConditionEffects={clearBadConditionEffects} />}
            {activeTab === 'abilities' && <AbilitiesTab record={record} updateRecord={updateRecord} />}
            {activeTab === 'items' && (
              <ItemsTab
                record={record}
                category={itemCategory}
                setCategory={setItemCategory}
                selectedInventory={selectedInventory}
                setSelectedInventory={setSelectedInventory}
                selectedCatalogId={selectedCatalogId}
                setSelectedCatalogId={setSelectedCatalogId}
                filter={catalogFilter}
                setFilter={setCatalogFilter}
                usableOnly={usableOnly}
                setUsableOnly={setUsableOnly}
                updateRecord={updateRecord}
              />
            )}
            {activeTab === 'appearance' && (
              <AppearanceTab record={record} mode={appearanceMode} setMode={setAppearanceMode} updateRecord={updateRecord} />
            )}
          </section>
        </div>
      ) : null}
    </main>
  )
}

function CharacterSummary({ record, issues }: { record: CharacterRecord; issues: ValidationIssue[] }) {
  return (
    <>
      <div className="portrait-stack">
        <img src={realmzAsset(`portraits/${record.pictid}.png`)} alt="" />
        <img src={realmzAsset(`combat/${record.iconid}.png`)} alt="" />
      </div>
      <dl className="summary-list">
        <div><dt>Race</dt><dd>{labelFor(metadata.races, record.race, `Race ${record.race}`)}</dd></div>
        <div><dt>Caste</dt><dd>{labelFor(metadata.castes, record.caste, `Caste ${record.caste}`)}</dd></div>
        <div><dt>Gender</dt><dd>{labelFor(metadata.genders, record.gender, `Gender ${record.gender}`)}</dd></div>
        <div><dt>Stamina</dt><dd>{record.stamina}/{record.staminamax}</dd></div>
        <div><dt>Spell Pts</dt><dd>{record.spellpoints}/{record.spellpointsmax}</dd></div>
        <div><dt>Inventory</dt><dd>{record.numitems}/30</dd></div>
        <div><dt>Load</dt><dd>{record.load}/{record.loadmax}</dd></div>
      </dl>
      <div className="validation-panel">
        <h2>Validation</h2>
        {issues.length === 0 ? (
          <p className="ok">Ready to download.</p>
        ) : (
          <ul>
            {issues.map((issue) => (
              <li key={issue.message} className={issue.severity}>{issue.message}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function CoreTab({ record, updateRecord, levelUp }: { record: CharacterRecord; updateRecord: UpdateRecord; levelUp: () => void }) {
  return (
    <div className="tab-grid">
      <Panel title="Identity">
        <label className="field">
          <span>Name</span>
          <input value={record.name} maxLength={28} onChange={(event) => updateRecord((draft) => { draft.name = event.target.value })} />
        </label>
        <SelectField label="Race" value={record.race} options={metadata.races} onChange={(value) => updateRecord((draft) => { draft.race = value })} />
        <SelectField label="Caste" value={record.caste} options={metadata.castes} onChange={(value) => updateRecord((draft) => { draft.caste = value })} />
        <SelectField label="Gender" value={record.gender} options={metadata.genders} onChange={(value) => updateRecord((draft) => { draft.gender = value })} />
        <NumberField label="Age (years)" value={Math.trunc(record.age / 365)} min={0} max={10000} onChange={(value) => updateRecord((draft) => { draft.age = value * 365 })} />
        <div className="field action-field">
          <span>Level</span>
          <div className="level-up-control">
            <strong>{record.level}</strong>
            <button type="button" disabled={record.level >= 1000} onClick={levelUp}>Level Up</button>
          </div>
        </div>
      </Panel>

      <Panel title="Base Stats">
        {statFields.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            value={record[field.key]}
            min={0}
            max={127}
            onChange={(value) => updateRecord((draft) => { draft[field.key] = clampSigned(value, 0, 127) })}
          />
        ))}
      </Panel>

      <Panel title="Vitals And Money">
        <NumberField label="Stamina Current" value={record.stamina} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.stamina = value })} />
        <NumberField label="Stamina Max" value={record.staminamax} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.staminamax = value })} />
        <NumberField label="Spell Points Current" value={record.spellpoints} min={0} max={32767} onChange={(value) => updateRecord((draft) => { setSpellpointsCurrent(draft, value) })} />
        <NumberField label="Spell Points Max" value={record.spellpointsmax} min={0} max={32767} onChange={(value) => updateRecord((draft) => { setSpellpointsMax(draft, value) })} />
        <NumberField label="Movement" value={record.movement} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.movement = value })} />
        <NumberField label="Movement Max" value={record.movementmax} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.movementmax = value })} />
        <NumberField label="Gold" value={record.money[0]} min={0} max={65535} onChange={(value) => updateRecord((draft) => { draft.money[0] = value })} />
        <NumberField label="Gems" value={record.money[1]} min={0} max={65535} onChange={(value) => updateRecord((draft) => { draft.money[1] = value })} />
        <NumberField label="Jewelry" value={record.money[2]} min={0} max={65535} onChange={(value) => updateRecord((draft) => { draft.money[2] = value })} />
      </Panel>

      <Panel title="Combat">
        <NumberField label="Attack Bonus" value={record.attackbonus} min={-20} max={100} onChange={(value) => updateRecord((draft) => { draft.attackbonus = value })} />
        <NumberField label="Defense Bonus" value={record.condition[38]} min={-200} max={200} onChange={(value) => updateRecord((draft) => { draft.condition[38] = value })} />
        <NumberField label="Missile Adjust %" value={record.missile} min={0} max={100} onChange={(value) => updateRecord((draft) => { draft.missile = value })} />
        <NumberField label="Dodge Missile %" value={record.dodge} min={0} max={100} onChange={(value) => updateRecord((draft) => { draft.dodge = value })} />
        <NumberField label="Hand To Hand" value={record.handtohand} min={0} max={200} onChange={(value) => updateRecord((draft) => { draft.handtohand = value })} />
        <NumberField label="Damage +" value={record.damage} min={0} max={200} onChange={(value) => updateRecord((draft) => { draft.damage = value })} />
        <NumberField label="Chance To Hit %" value={record.tohit} min={-200} max={200} onChange={(value) => updateRecord((draft) => { draft.tohit = value })} />
        <NumberField label="Armor Rating" value={record.ac} min={-200} max={200} onChange={(value) => updateRecord((draft) => { draft.ac = value })} />
        <NumberField label="Magic Resistance %" value={record.magres} min={0} max={100} onChange={(value) => updateRecord((draft) => { draft.magres = value })} />
      </Panel>

      <Panel title="Saving Throws">
        {metadata.saves.map((label, index) => (
          <NumberField key={label} label={label} value={record.save[index]} min={-99} max={120} onChange={(value) => updateRecord((draft) => { draft.save[index] = value })} />
        ))}
      </Panel>

      <Panel title="Counters">
        {counterFields.map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            value={record[field.key]}
            min={field.min}
            max={field.max}
            onChange={(value) => updateRecord((draft) => { draft[field.key] = value })}
          />
        ))}
      </Panel>
    </div>
  )
}

function SpellsTab({ record, spellLevel, setSpellLevel, updateRecord }: { record: CharacterRecord; spellLevel: number; setSpellLevel: (value: number) => void; updateRecord: UpdateRecord }) {
  const progression = spellProgressionForRecord(record)
  const activeProgression = activeSpellProgression(record)
  const casteName = labelFor(metadata.castes, record.caste, `Caste ${record.caste}`)
  const casterName = progression ? labelFor(metadata.spellcasters, progression.casterType, `Spellcaster ${progression.casterType}`) : 'None'
  const activeSpellLevel = activeProgression ? Math.min(spellLevel, activeProgression.maxSpellLevel - 1) : 0

  return (
    <div className="vertical-panel">
      <Panel title="Spellcasting">
        <ReadonlyField label="Spellcaster" value={progression ? casterName : 'None'} />
        {!progression && (
          <p className="empty-note">{casteName} does not gain spellcasting.</p>
        )}
        {progression && !activeProgression && (
          <p className="empty-note">{casteName} gains {casterName} spells at level {progression.startLevel}.</p>
        )}
        {activeProgression && activeProgression.maxSpellLevel < 7 && (
          <p className="empty-note">{casteName} can learn spell levels 1-{activeProgression.maxSpellLevel}.</p>
        )}
        <div className="level-tabs">
          {Array.from({ length: 7 }, (_, level) => (
            <button
              key={level}
              type="button"
              className={activeProgression && level === activeSpellLevel ? 'active' : ''}
              disabled={!activeProgression || level >= activeProgression.maxSpellLevel}
              onClick={() => setSpellLevel(level)}
            >
              {level + 1}
            </button>
          ))}
        </div>
        {!activeProgression ? (
          <p className="empty-note">Spell selection is not available at level {record.level}.</p>
        ) : (
          <div className="spell-grid">
            {Array.from({ length: 12 }, (_, index) => {
              const spell = spellFor(activeProgression.casterType, activeSpellLevel, index)
              const checked = !!record.cspells[activeSpellLevel][index]
              return (
                <label key={index} className={`check-row ${checked ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => updateRecord((draft) => {
                      draft.spellcastertype = activeProgression.casterType
                      draft.cspells[activeSpellLevel][index] = draft.cspells[activeSpellLevel][index] ? 0 : 1
                    })}
                  />
                  <span>{spell?.name ?? `Spell ${activeSpellLevel + 1}-${index + 1}`}</span>
                </label>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}

function ConditionsTab({ record, updateRecord, clearBadConditionEffects }: { record: CharacterRecord; updateRecord: UpdateRecord; clearBadConditionEffects: () => void }) {
  const hasBadEffects = record.condition.some((value, index) => isBadConditionValue(index, value))
  return (
    <>
      <div className="condition-toolbar">
        <p><strong>Negative values are permanent.</strong> Non-zero conditions are highlighted.</p>
        <button type="button" disabled={!hasBadEffects} onClick={clearBadConditionEffects}>Clear Bad Effects</button>
      </div>
      <div className="condition-grid">
        {record.condition.map((value, index) => (
          <label className={conditionFieldClass(index, value)} key={index}>
            <span>{conditionDisplayLabels[index] ?? metadata.conditions[index]}</span>
            <input
              type="number"
              value={Number.isFinite(value) ? value : 0}
              min={-32768}
              max={32767}
              onChange={(event) => updateRecord((draft) => { draft.condition[index] = clampSigned(Number(event.target.value), -32768, 32767) })}
            />
          </label>
        ))}
      </div>
    </>
  )
}

function conditionFieldClass(index: number, value: number): string {
  const classes = ['condition-field']
  if (value > 0) {
    classes.push('active')
  } else if (value < 0) {
    classes.push('permanent')
  }
  if (isBadConditionValue(index, value)) {
    classes.push('bad')
  }
  return classes.join(' ')
}

function AbilitiesTab({ record, updateRecord }: { record: CharacterRecord; updateRecord: UpdateRecord }) {
  const successIndexes = [0, 3, 4, 5, 6, 7, 9, 11, 13]
  return (
    <div className="tab-grid two">
      <Panel title="Creature Bonuses">
        {metadata.specials.map((label, index) => (
          <NumberField key={label} label={label} value={record.special[index]} min={-32768} max={32767} onChange={(value) => updateRecord((draft) => { draft.special[index] = value })} />
        ))}
      </Panel>
      <Panel title="Success Percentages">
        {successIndexes.map((specIndex) => (
          <NumberField key={specIndex} label={metadata.specs[specIndex]} value={record.spec[specIndex]} min={0} max={100} onChange={(value) => updateRecord((draft) => { draft.spec[specIndex] = value })} />
        ))}
      </Panel>
    </div>
  )
}

function ItemsTab({
  record,
  category,
  setCategory,
  selectedInventory,
  setSelectedInventory,
  selectedCatalogId,
  setSelectedCatalogId,
  filter,
  setFilter,
  usableOnly,
  setUsableOnly,
  updateRecord,
}: {
  record: CharacterRecord
  category: ItemCategoryId
  setCategory: (category: ItemCategoryId) => void
  selectedInventory: number
  setSelectedInventory: (index: number) => void
  selectedCatalogId: number | null
  setSelectedCatalogId: (id: number | null) => void
  filter: string
  setFilter: (value: string) => void
  usableOnly: boolean
  setUsableOnly: (value: boolean) => void
  updateRecord: UpdateRecord
}) {
  const inventory = record.items.slice(0, record.numitems)
  const catalog = itemsForCategory(category)
    .filter((item) => !usableOnly || canCharacterUseItem(item, record))
    .filter((item) => `${item.id} ${item.name}`.toLowerCase().includes(filter.toLowerCase()))
  const selectedInventoryItem = inventory[selectedInventory]
  const selectedCatalogItem = catalog.find((item) => item.id === selectedCatalogId) ?? catalog[0]
  const detail = selectedCatalogItem ?? (selectedInventoryItem ? itemById(selectedInventoryItem.id) : undefined)
  const dragPayload = useRef<{ catalogItemId?: number; inventoryIndex?: number } | null>(null)

  const activateItemRow = (event: KeyboardEvent<HTMLElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }

  const addCatalogItem = (itemId: number) => {
    if (record.numitems >= 30) {
      return
    }
    updateRecord((draft) => { addItem(draft, itemId) })
    setSelectedInventory(record.numitems)
  }

  const moveInventoryItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return
    }
    updateRecord((draft) => { moveItem(draft, fromIndex, toIndex) })
    setSelectedInventory(toIndex)
  }

  const allowItemDrop = (event: DragEvent<HTMLElement>) => {
    const types = Array.from(event.dataTransfer.types)
    if (types.includes(catalogDragType) || types.includes(inventoryDragType) || dragPayload.current) {
      event.preventDefault()
      event.dataTransfer.dropEffect = types.includes(catalogDragType) || dragPayload.current?.catalogItemId ? 'copy' : 'move'
    }
  }

  const handleInventoryDrop = (event: DragEvent<HTMLElement>, toIndex = Math.max(0, inventory.length - 1)) => {
    event.preventDefault()
    const catalogItemData = event.dataTransfer.getData(catalogDragType)
    const itemId = catalogItemData ? Number(catalogItemData) : dragPayload.current?.catalogItemId
    if (typeof itemId === 'number' && Number.isFinite(itemId) && itemId > 0) {
      dragPayload.current = null
      addCatalogItem(itemId)
      return
    }
    const inventoryIndexData = event.dataTransfer.getData(inventoryDragType)
    const fromIndex = inventoryIndexData ? Number(inventoryIndexData) : dragPayload.current?.inventoryIndex
    dragPayload.current = null
    if (typeof fromIndex === 'number' && Number.isInteger(fromIndex) && inventory.length > 0) {
      moveInventoryItem(fromIndex, Math.min(Math.max(toIndex, 0), inventory.length - 1))
    }
  }

  return (
    <div className="items-layout">
      <Panel title={`Inventory ${record.numitems}/30 - Load ${record.load}/${record.loadmax}`}>
        <div className="list inventory-dropzone" onDragOver={allowItemDrop} onDrop={handleInventoryDrop}>
          {inventory.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              role="button"
              tabIndex={0}
              aria-selected={index === selectedInventory}
              className={`item-row ${index === selectedInventory ? 'selected' : ''}`}
              draggable
              onPointerDown={() => {
                dragPayload.current = { inventoryIndex: index }
              }}
              onDragStart={(event) => {
                dragPayload.current = { inventoryIndex: index }
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData(inventoryDragType, String(index))
              }}
              onDragEnd={() => { dragPayload.current = null }}
              onDragOver={allowItemDrop}
              onDrop={(event) => {
                event.stopPropagation()
                handleInventoryDrop(event, index)
              }}
              onClick={() => {
                dragPayload.current = null
                setSelectedInventory(index)
              }}
              onKeyDown={(event) => activateItemRow(event, () => setSelectedInventory(index))}
            >
              <ItemIcon item={itemById(item.id)} identified={!!item.ident} />
              <span>{item.ident ? '*' : '?'} {itemName(item.id, !!item.ident)}</span>
              <b>chg {item.charge}</b>
            </div>
          ))}
        </div>
        {selectedInventoryItem && (
          <div className="inline-actions">
            <button type="button" onClick={() => updateRecord((draft) => { removeItem(draft, selectedInventory) })}>Remove</button>
            <button type="button" onClick={() => updateRecord((draft) => { draft.items[selectedInventory].ident = draft.items[selectedInventory].ident ? 0 : 1 })}>Ident</button>
            <NumberField label="Charge" value={selectedInventoryItem.charge} min={-32768} max={32767} onChange={(value) => updateRecord((draft) => { draft.items[selectedInventory].charge = value })} />
          </div>
        )}
      </Panel>
      <Panel title="Catalog">
        <div className="catalog-controls">
          <div className="segmented">
            {itemCategoryLabels.map((entry) => (
              <button key={entry.id} type="button" className={entry.id === category ? 'active' : ''} onClick={() => { setCategory(entry.id); setSelectedCatalogId(null) }}>{entry.label}</button>
            ))}
          </div>
          <label className="usable-toggle">
            <strong>Usable</strong>
            <input
              type="checkbox"
              checked={usableOnly}
              onChange={(event) => {
                setUsableOnly(event.target.checked)
                setSelectedCatalogId(null)
              }}
            />
          </label>
        </div>
        <input className="search" value={filter} placeholder="Filter catalog" onChange={(event) => setFilter(event.target.value)} />
        <div className="list catalog">
          {catalog.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-selected={item.id === selectedCatalogId}
              className={`item-row ${item.id === selectedCatalogId ? 'selected' : ''}`}
              draggable
              onPointerDown={() => {
                dragPayload.current = { catalogItemId: item.id }
              }}
              onDragStart={(event) => {
                dragPayload.current = { catalogItemId: item.id }
                event.dataTransfer.effectAllowed = 'copy'
                event.dataTransfer.setData(catalogDragType, String(item.id))
              }}
              onDragEnd={() => { dragPayload.current = null }}
              onClick={() => {
                dragPayload.current = null
                setSelectedCatalogId(item.id)
              }}
              onKeyDown={(event) => activateItemRow(event, () => setSelectedCatalogId(item.id))}
            >
              <ItemIcon item={item} />
              <span>{item.name}</span>
              <b>{item.id}</b>
            </div>
          ))}
        </div>
        <button type="button" disabled={!selectedCatalogItem} onClick={() => selectedCatalogItem && addCatalogItem(selectedCatalogItem.id)}>Add Selected</button>
      </Panel>
      <Panel title="Item Detail">
        {detail ? (
          <div className="detail-panel">
            <ItemIcon item={detail} large />
            <h3>{detail.name}</h3>
            <p>{detail.description}</p>
            <dl className="summary-list compact">
              <div><dt>ID</dt><dd>{detail.id}</dd></div>
              <div><dt>Type</dt><dd>{detail.type}</dd></div>
              <div><dt>Weight</dt><dd>{detail.weight}</dd></div>
              <div><dt>Charge</dt><dd>{detail.charge}</dd></div>
              <div><dt>Damage</dt><dd>{detail.damage}</dd></div>
              <div><dt>AC</dt><dd>{detail.ac}</dd></div>
              <div><dt>MR</dt><dd>{detail.magres}</dd></div>
            </dl>
          </div>
        ) : (
          <p className="empty-note">Select an inventory or catalog item.</p>
        )}
      </Panel>
    </div>
  )
}

function AppearanceTab({ record, mode, setMode, updateRecord }: { record: CharacterRecord; mode: 'portrait' | 'combat'; setMode: (mode: 'portrait' | 'combat') => void; updateRecord: UpdateRecord }) {
  const options = mode === 'portrait' ? metadata.portraits : metadata.combatIcons
  const currentId = mode === 'portrait' ? record.pictid : record.iconid
  return (
    <div className="vertical-panel">
      <Panel title="Appearance">
        <div className="appearance-current">
          <img src={realmzAsset(`portraits/${record.pictid}.png`)} alt="" />
          <img src={realmzAsset(`combat/${record.iconid}.png`)} alt="" />
          <div>
            <SelectField label="Picker" value={mode === 'portrait' ? 1 : 2} options={[{ id: 1, name: 'Portrait' }, { id: 2, name: 'Combat Icon' }]} onChange={(value) => setMode(value === 1 ? 'portrait' : 'combat')} />
            <NumberField label="Portrait ID" value={record.pictid} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.pictid = value; draft.iconid = pairedCombatIconForPortrait(value) })} />
            <NumberField label="Combat Icon ID" value={record.iconid} min={0} max={32767} onChange={(value) => updateRecord((draft) => { draft.iconid = value })} />
          </div>
        </div>
        <div className="image-grid">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={option.id === currentId ? 'selected' : ''}
              onClick={() => updateRecord((draft) => {
                if (mode === 'portrait') {
                  draft.pictid = option.id
                  draft.iconid = pairedCombatIconForPortrait(option.id)
                } else {
                  draft.iconid = option.id
                }
              })}
            >
              <img src={realmzAsset(`${mode === 'portrait' ? 'portraits' : 'combat'}/${option.id}.png`)} alt="" />
              <span>{option.id}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(event) => onChange(clampSigned(Number(event.target.value), min, max))}
      />
    </label>
  )
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="field readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: number; options: { id: number; name: string }[]; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  )
}

function ItemIcon({ item, identified = true, large = false }: { item?: ItemMetadata; identified?: boolean; large?: boolean }) {
  const iconId = item ? (identified ? item.displayIconId : item.unidentifiedIconId) : 0
  if (!iconId) {
    return <span className={large ? 'item-icon large empty' : 'item-icon empty'} aria-hidden="true" />
  }
  return <img className={large ? 'item-icon large' : 'item-icon'} src={realmzAsset(`icons/${iconId}.png`)} alt="" />
}

export default App
