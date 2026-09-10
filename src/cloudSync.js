import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  importMedicationsIfEmpty,
  listAllMedicationRows,
  listPendingMovements,
  markMedicationSynced,
  markMovementSynced,
} from './localDb'

export async function importFromFirebaseIfNeeded() {
  try {
    const snap = await getDocs(collection(db, 'medicamentos'))
    const items = []
    snap.forEach(item => items.push({ id: item.id, ...item.data() }))
    return await importMedicationsIfEmpty(items)
  } catch {
    return false
  }
}

export async function syncPendingToFirebase() {
  const result = { medications: 0, movements: 0, online: false }

  try {
    const rows = await listAllMedicationRows()
    const pending = rows.filter(row => row.syncState !== 'synced')

    for (const row of pending) {
      const ref = doc(db, 'medicamentos', row.id)
      if (Number(row.deleted) === 1) {
        await deleteDoc(ref)
      } else {
        await setDoc(ref, {
          nome: row.nome,
          total: Number(row.total || 0),
          alerta: Number(row.alerta || 0),
          dataCompra: row.dataCompra,
          configDoses: row.configDoses || [],
          criadoEm: row.criadoEm || null,
          atualizadoEm: row.atualizadoEm || null,
        }, { merge: true })
      }
      await markMedicationSynced(row.id)
      result.medications += 1
    }

    const movements = await listPendingMovements()
    for (const movement of movements) {
      await setDoc(doc(db, 'movimentos', movement.id), {
        medicamentoId: movement.medicamentoId || null,
        medicamentoNome: movement.medicamentoNome || null,
        tipo: movement.tipo,
        quantidade: Number(movement.quantidade || 0),
        ocorridoEm: movement.ocorridoEm,
        detalhes: movement.detalhes || {},
      }, { merge: true })
      await markMovementSynced(movement.id)
      result.movements += 1
    }

    result.online = true
  } catch {
    // Offline é um estado normal: os registros ficam pendentes no banco local.
  }

  return result
}
