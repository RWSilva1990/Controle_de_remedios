import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'rws_remedios'
const DB_VERSION = 1
const WEB_KEY = 'rws-remedios-offline-db-v1'
const PROFILE_KEY = 'userProfile'

let sqlite = null
let nativeDb = null
let initPromise = null

function isNative() {
  return Capacitor.isNativePlatform()
}

function nowIso() {
  return new Date().toISOString()
}

function newId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function defaultWebState() {
  return { medicamentos: [], movimentos: [], meta: {} }
}

function readWebState() {
  try {
    const raw = localStorage.getItem(WEB_KEY)
    return raw ? { ...defaultWebState(), ...JSON.parse(raw) } : defaultWebState()
  } catch {
    return defaultWebState()
  }
}

function writeWebState(state) {
  localStorage.setItem(WEB_KEY, JSON.stringify(state))
}

function parseMedication(row) {
  return {
    id: row.id,
    nome: row.nome,
    total: Number(row.total || 0),
    alerta: Number(row.alerta || 0),
    dataCompra: row.dataCompra,
    configDoses: typeof row.configDoses === 'string' ? JSON.parse(row.configDoses || '[]') : (row.configDoses || []),
    criadoEm: row.criadoEm || null,
    atualizadoEm: row.atualizadoEm || null,
  }
}

export async function initLocalDb() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (!isNative()) return true

    sqlite = new SQLiteConnection(CapacitorSQLite)
    const consistency = await sqlite.checkConnectionsConsistency()
    const existing = await sqlite.isConnection(DB_NAME, false)

    if (consistency.result && existing.result) {
      nativeDb = await sqlite.retrieveConnection(DB_NAME, false)
    } else {
      nativeDb = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
    }

    await nativeDb.open()
    await nativeDb.execute(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id TEXT PRIMARY KEY NOT NULL,
        nome TEXT NOT NULL,
        total REAL NOT NULL DEFAULT 0,
        alerta REAL NOT NULL DEFAULT 0,
        dataCompra TEXT NOT NULL,
        configDoses TEXT NOT NULL DEFAULT '[]',
        criadoEm TEXT,
        atualizadoEm TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        syncState TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS movimentos (
        id TEXT PRIMARY KEY NOT NULL,
        medicamentoId TEXT,
        medicamentoNome TEXT,
        tipo TEXT NOT NULL,
        quantidade REAL NOT NULL DEFAULT 0,
        ocorridoEm TEXT NOT NULL,
        detalhes TEXT NOT NULL DEFAULT '{}',
        syncState TEXT NOT NULL DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS meta (
        chave TEXT PRIMARY KEY NOT NULL,
        valor TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_movimentos_ocorridoEm ON movimentos(ocorridoEm DESC);
      CREATE INDEX IF NOT EXISTS idx_movimentos_medicamentoId ON movimentos(medicamentoId);
    `)

    return true
  })()

  return initPromise
}

export async function listMedications() {
  await initLocalDb()

  if (!isNative()) {
    return readWebState().medicamentos
      .filter(item => !item.deleted)
      .map(parseMedication)
  }

  const result = await nativeDb.query('SELECT * FROM medicamentos WHERE deleted = 0 ORDER BY nome COLLATE NOCASE')
  return (result.values || []).map(parseMedication)
}

export async function listAllMedicationRows() {
  await initLocalDb()

  if (!isNative()) return readWebState().medicamentos.map(item => ({ ...item }))

  const result = await nativeDb.query('SELECT * FROM medicamentos ORDER BY atualizadoEm ASC')
  return (result.values || []).map(row => ({
    ...row,
    total: Number(row.total || 0),
    alerta: Number(row.alerta || 0),
    deleted: Number(row.deleted || 0),
    configDoses: typeof row.configDoses === 'string' ? JSON.parse(row.configDoses || '[]') : (row.configDoses || []),
  }))
}

export async function saveMedication(med, { synced = false } = {}) {
  await initLocalDb()
  const item = {
    id: med.id || newId('med'),
    nome: med.nome,
    total: Number(med.total || 0),
    alerta: Number(med.alerta || 0),
    dataCompra: med.dataCompra || nowIso(),
    configDoses: med.configDoses || [],
    criadoEm: med.criadoEm || nowIso(),
    atualizadoEm: med.atualizadoEm || nowIso(),
    deleted: 0,
    syncState: synced ? 'synced' : 'pending',
  }

  if (!isNative()) {
    const state = readWebState()
    const index = state.medicamentos.findIndex(row => row.id === item.id)
    if (index >= 0) state.medicamentos[index] = item
    else state.medicamentos.push(item)
    writeWebState(state)
    return parseMedication(item)
  }

  await nativeDb.run(
    `INSERT OR REPLACE INTO medicamentos
      (id, nome, total, alerta, dataCompra, configDoses, criadoEm, atualizadoEm, deleted, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [item.id, item.nome, item.total, item.alerta, item.dataCompra, JSON.stringify(item.configDoses), item.criadoEm, item.atualizadoEm, item.syncState]
  )

  return parseMedication(item)
}

export async function markMedicationDeleted(id) {
  await initLocalDb()
  const atualizadoEm = nowIso()

  if (!isNative()) {
    const state = readWebState()
    const item = state.medicamentos.find(row => row.id === id)
    if (item) {
      item.deleted = 1
      item.atualizadoEm = atualizadoEm
      item.syncState = 'pending'
      writeWebState(state)
    }
    return
  }

  await nativeDb.run(
    'UPDATE medicamentos SET deleted = 1, atualizadoEm = ?, syncState = ? WHERE id = ?',
    [atualizadoEm, 'pending', id]
  )
}

export async function markMedicationSynced(id) {
  await initLocalDb()
  if (!isNative()) {
    const state = readWebState()
    const item = state.medicamentos.find(row => row.id === id)
    if (item) item.syncState = 'synced'
    writeWebState(state)
    return
  }
  await nativeDb.run('UPDATE medicamentos SET syncState = ? WHERE id = ?', ['synced', id])
}

export async function importMedicationsIfEmpty(items) {
  const current = await listAllMedicationRows()
  if (current.length || !items?.length) return false
  for (const item of items) await saveMedication(item, { synced: true })
  await setMeta('cloudImported', nowIso())
  return true
}

export async function recordMovement({ medicamentoId = null, medicamentoNome = null, tipo, quantidade = 0, ocorridoEm, detalhes = {}, id }) {
  await initLocalDb()
  const item = {
    id: id || newId('mov'),
    medicamentoId,
    medicamentoNome,
    tipo,
    quantidade: Number(quantidade || 0),
    ocorridoEm: ocorridoEm || nowIso(),
    detalhes,
    syncState: 'pending',
  }

  if (!isNative()) {
    const state = readWebState()
    if (!state.movimentos.some(row => row.id === item.id)) state.movimentos.push(item)
    writeWebState(state)
    return item
  }

  await nativeDb.run(
    `INSERT OR IGNORE INTO movimentos
      (id, medicamentoId, medicamentoNome, tipo, quantidade, ocorridoEm, detalhes, syncState)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.medicamentoId, item.medicamentoNome, item.tipo, item.quantidade, item.ocorridoEm, JSON.stringify(item.detalhes), item.syncState]
  )
  return item
}

export async function listMovements(limit = 200) {
  await initLocalDb()
  if (!isNative()) {
    return [...readWebState().movimentos]
      .sort((a, b) => b.ocorridoEm.localeCompare(a.ocorridoEm))
      .slice(0, limit)
  }
  const result = await nativeDb.query('SELECT * FROM movimentos ORDER BY ocorridoEm DESC LIMIT ?', [limit])
  return (result.values || []).map(row => ({
    ...row,
    quantidade: Number(row.quantidade || 0),
    detalhes: typeof row.detalhes === 'string' ? JSON.parse(row.detalhes || '{}') : (row.detalhes || {}),
  }))
}

export async function listPendingMovements() {
  await initLocalDb()
  if (!isNative()) return readWebState().movimentos.filter(row => row.syncState !== 'synced')
  const result = await nativeDb.query('SELECT * FROM movimentos WHERE syncState != ?', ['synced'])
  return (result.values || []).map(row => ({
    ...row,
    quantidade: Number(row.quantidade || 0),
    detalhes: typeof row.detalhes === 'string' ? JSON.parse(row.detalhes || '{}') : (row.detalhes || {}),
  }))
}

export async function markMovementSynced(id) {
  await initLocalDb()
  if (!isNative()) {
    const state = readWebState()
    const item = state.movimentos.find(row => row.id === id)
    if (item) item.syncState = 'synced'
    writeWebState(state)
    return
  }
  await nativeDb.run('UPDATE movimentos SET syncState = ? WHERE id = ?', ['synced', id])
}

export async function getMeta(chave) {
  await initLocalDb()
  if (!isNative()) return readWebState().meta[chave] || null
  const result = await nativeDb.query('SELECT valor FROM meta WHERE chave = ?', [chave])
  return result.values?.[0]?.valor || null
}

export async function setMeta(chave, valor) {
  await initLocalDb()
  if (!isNative()) {
    const state = readWebState()
    state.meta[chave] = valor
    writeWebState(state)
    return
  }
  await nativeDb.run('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)', [chave, valor])
}

export async function getUserProfile() {
  const raw = await getMeta(PROFILE_KEY)
  if (!raw) return { nome: '', idade: '', tipoSanguineo: '', telefone: '', foto: '' }
  try {
    return {
      nome: '', idade: '', tipoSanguineo: '', telefone: '', foto: '',
      ...JSON.parse(raw),
    }
  } catch {
    return { nome: '', idade: '', tipoSanguineo: '', telefone: '', foto: '' }
  }
}

export async function saveUserProfile(profile) {
  const normalized = {
    nome: String(profile.nome || '').trim(),
    idade: profile.idade === '' ? '' : Number(profile.idade),
    tipoSanguineo: String(profile.tipoSanguineo || ''),
    telefone: String(profile.telefone || '').trim(),
    foto: String(profile.foto || ''),
    atualizadoEm: nowIso(),
  }
  await setMeta(PROFILE_KEY, JSON.stringify(normalized))
  return normalized
}
