import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import Login from './components/Login'
import TabMeds from './components/TabMeds'
import TabAdd from './components/TabAdd'
import TabConfig from './components/TabConfig'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import ModalRecarga from './components/ModalRecarga'
import styles from './App.module.css'

const SENHA = 'Jessy@0407'

export function calcularEstoque(med, agora = new Date()) {
  const dataInicio = new Date(med.dataCompra)
  if (dataInicio >= agora) return med.total
  let consumido = 0
  let dia = new Date(dataInicio)
  dia.setHours(0, 0, 0, 0)
  while (dia <= agora) {
    ;(med.configDoses || []).forEach(dose => {
      const [h, m] = dose.hora.split(':').map(Number)
      const momento = new Date(dia)
      momento.setHours(h, m, 0, 0)
      if (momento >= dataInicio && momento <= agora) {
        consumido += Number(dose.qtd)
      }
    })
    dia.setDate(dia.getDate() + 1)
  }
  return Math.max(0, med.total - consumido)
}

// ── Agenda alarmes locais via Notification API ──
function agendarAlarmes(medicamentos) {
  if (Notification.permission !== 'granted') return

  // Limpa intervalos anteriores
  if (window._alarmeInterval) clearInterval(window._alarmeInterval)

  // Verifica a cada minuto se alguma dose bate com a hora atual
  window._alarmeInterval = setInterval(() => {
    const agora = new Date()
    const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    medicamentos.forEach(med => {
      const estoque = calcularEstoque(med, agora)
      ;(med.configDoses || []).forEach(dose => {
        if (dose.hora === horaAtual) {
          // Notificação de dose
          new Notification(`💊 ${med.nome}`, {
            body: `Tome agora ${dose.qtd} comprimido(s). Restam ${estoque}.`,
            icon: '/icon-192.png',
            tag: `dose-${med.id}-${horaAtual}`,
            vibrate: [200, 100, 200]
          })

          // Verifica estoque mínimo
          const estoqueApos = Math.max(0, estoque - Number(dose.qtd))
          if (estoqueApos <= med.alerta) {
            setTimeout(() => {
              new Notification(`⚠️ Estoque baixo: ${med.nome}`, {
                body: `Restam apenas ${estoqueApos} comprimido(s). Compre mais!`,
                icon: '/icon-192.png',
                tag: `alerta-${med.id}`,
              })
            }, 3000)
          }
        }
      })
    })
  }, 60000) // verifica a cada 1 minuto
}

export default function App() {
  const [logado, setLogado]             = useState(false)
  const [tab, setTab]                   = useState('meds')
  const [medicamentos, setMedicamentos] = useState([])
  const [loading, setLoading]           = useState(false)
  const [toast, setToast]               = useState('')
  const [modalMedId, setModalMedId]     = useState(null)
  const [notifAtiva, setNotifAtiva]     = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'medicamentos'))
      const lista = []
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }))
      setMedicamentos(lista)
      // Reagenda alarmes com dados atualizados
      if (Notification.permission === 'granted') agendarAlarmes(lista)
    } catch(e) {
      showToast('Erro ao carregar dados 😕')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (logado) {
      carregar()
      setNotifAtiva(Notification.permission === 'granted')
    }
  }, [logado, carregar])

  const handleLogin = (senha) => {
    if (senha === SENHA) setLogado(true)
    else showToast('Senha incorreta')
  }

  const ativarNotificacoes = async () => {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifAtiva(true)
      agendarAlarmes(medicamentos)
      showToast('✅ Notificações ativadas!')
      return true
    } else {
      showToast('Permissão negada')
      return false
    }
  }

  const salvarMed = async ({ nome, total, alerta, dataCompra, configDoses }) => {
    const existente = medicamentos.find(m => m.nome === nome)
    try {
      if (existente) {
        const estoqueAtual = calcularEstoque(existente)
        await updateDoc(doc(db, 'medicamentos', existente.id), {
          total: estoqueAtual + total,
          dataCompra: new Date(Date.now() + 60000).toISOString(),
          alerta, configDoses
        })
        showToast(`✅ ${nome} atualizado!`)
      } else {
        await addDoc(collection(db, 'medicamentos'), {
          nome, total, alerta, dataCompra,
          configDoses,
          criadoEm: new Date().toISOString()
        })
        showToast(`✅ ${nome} cadastrado!`)
      }
      await carregar()
      setTab('meds')
    } catch(e) {
      showToast('Erro ao salvar 😕')
      throw e
    }
  }

  const removerMed = async (id, nome) => {
    if (!window.confirm(`Remover ${nome}?`)) return
    try {
      await deleteDoc(doc(db, 'medicamentos', id))
      showToast(`🗑️ ${nome} removido`)
      await carregar()
    } catch(e) {
      showToast('Erro ao remover')
    }
  }

  const confirmarRecarga = async (id, qtd) => {
    const med = medicamentos.find(m => m.id === id)
    const estoqueAtual = calcularEstoque(med)
    try {
      await updateDoc(doc(db, 'medicamentos', id), {
        total: estoqueAtual + qtd,
        dataCompra: new Date(Date.now() + 60000).toISOString()
      })
      showToast(`📦 +${qtd} comprimidos adicionados!`)
      setModalMedId(null)
      await carregar()
    } catch(e) {
      showToast('Erro ao registrar recarga')
    }
  }

  if (!logado) return <Login onLogin={handleLogin} />

  const medModal = medicamentos.find(m => m.id === modalMedId)

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.dot} />
          RWS Remédios
        </div>
        <button className={styles.iconBtn} onClick={carregar} title="Atualizar">🔄</button>
      </div>

      <div className={styles.content}>
        {tab === 'meds' && (
          <TabMeds
            medicamentos={medicamentos}
            loading={loading}
            onRecarga={id => setModalMedId(id)}
            onRemover={removerMed}
          />
        )}
        {tab === 'add' && (
          <TabAdd onSalvar={salvarMed} showToast={showToast} />
        )}
        {tab === 'config' && (
          <TabConfig
            notifAtiva={notifAtiva}
            onAtivarNotif={ativarNotificacoes}
            showToast={showToast}
          />
        )}
      </div>

      <BottomNav tab={tab} onTab={setTab} />

      {medModal && (
        <ModalRecarga
          med={medModal}
          estoqueAtual={calcularEstoque(medModal)}
          onConfirm={(qtd) => confirmarRecarga(modalMedId, qtd)}
          onClose={() => setModalMedId(null)}
        />
      )}

      <Toast msg={toast} />
    </div>
  )
}
