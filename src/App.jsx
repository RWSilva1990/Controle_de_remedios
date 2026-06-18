import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import { db, messaging } from './firebase'
import Login from './components/Login'
import TabMeds from './components/TabMeds'
import TabAdd from './components/TabAdd'
import TabConfig from './components/TabConfig'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import ModalRecarga from './components/ModalRecarga'
import styles from './App.module.css'

const SENHA = 'Jessy@0407'
const VAPID = 'uJ67bHYeobWaZOPSQ-0cIQViyloCZ6TZdZ1RQIiyIvw'

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

export default function App() {
  const [logado, setLogado]           = useState(false)
  const [tab, setTab]                 = useState('meds')
  const [medicamentos, setMedicamentos] = useState([])
  const [loading, setLoading]         = useState(false)
  const [toast, setToast]             = useState('')
  const [modalMedId, setModalMedId]   = useState(null)

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
    } catch(e) {
      showToast('Erro ao carregar dados 😕')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (logado) carregar()
  }, [logado, carregar])

  const handleLogin = (senha) => {
    if (senha === SENHA) setLogado(true)
    else showToast('Senha incorreta')
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

  const ativarNotificacoes = async () => {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { showToast('Permissão negada'); return false }
      const token = await getToken(messaging, { vapidKey: VAPID })
      if (token) {
        await setDoc(doc(db, 'tokens', 'usuario_principal'), {
          token, atualizadoEm: new Date().toISOString()
        })
        showToast('✅ Notificações ativadas!')
        return true
      }
    } catch(e) {
      console.error('Erro detalhado ao ativar notificações:', e)
      showToast(`Erro: ${e.message || e.code || 'desconhecido'}`)
      return false
    }
  }

  if (!logado) return <Login onLogin={handleLogin} />

  const medModal = medicamentos.find(m => m.id === modalMedId)

  return (
    <div className={styles.shell}>
      {/* Topbar */}
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.dot} />
          RWS Remédios
        </div>
        <button className={styles.iconBtn} onClick={carregar} title="Atualizar">🔄</button>
      </div>

      {/* Content */}
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
