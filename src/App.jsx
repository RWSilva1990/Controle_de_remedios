import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import {
  getNotificationStatus,
  openExactAlarmSettings,
  requestNotificationPermission,
  scheduleMedicationNotifications,
  sendTestNotification,
} from './notifications'
import { openFullScreenAlarmSettings } from './nativeAlarm'
import Login from './components/Login'
import TabHome from './components/TabHome'
import TabMeds from './components/TabMeds'
import TabAdd from './components/TabAdd'
import TabHistory from './components/TabHistory'
import TabConfig from './components/TabConfig'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import ModalRecarga from './components/ModalRecarga'
import styles from './App.module.css'

const SENHA = '12345'

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
  const [logado, setLogado] = useState(false)
  const [tab, setTab] = useState('home')
  const [medicamentos, setMedicamentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [modalMedId, setModalMedId] = useState(null)
  const [notifAtiva, setNotifAtiva] = useState(false)
  const [exactAlarmStatus, setExactAlarmStatus] = useState('not-applicable')
  const [fullScreenStatus, setFullScreenStatus] = useState('not-applicable')
  const [nativeNotifications, setNativeNotifications] = useState(false)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const atualizarStatusNotificacoes = useCallback(async () => {
    try {
      const status = await getNotificationStatus()
      setNotifAtiva(status.display === 'granted')
      setExactAlarmStatus(status.exactAlarm)
      setFullScreenStatus(status.fullScreen)
      setNativeNotifications(status.native)
      return status
    } catch {
      setNotifAtiva(false)
      return null
    }
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'medicamentos'))
      const lista = []
      snap.forEach(d => lista.push({ id: d.id, ...d.data() }))
      setMedicamentos(lista)

      try {
        await scheduleMedicationNotifications(lista, calcularEstoque)
      } catch {
        // Falha de agendamento não deve impedir o uso ou carregamento do app.
      }
    } catch(e) {
      showToast('Erro ao carregar dados 😕')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (logado) {
      atualizarStatusNotificacoes()
      carregar()
    }
  }, [logado, carregar, atualizarStatusNotificacoes])

  const handleLogin = (senha) => {
    if (senha === SENHA) setLogado(true)
    else showToast('Senha incorreta')
  }

  const ativarNotificacoes = async () => {
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        setNotifAtiva(true)
        await scheduleMedicationNotifications(medicamentos, calcularEstoque)
        await atualizarStatusNotificacoes()
        showToast('✅ Notificações ativadas!')
        return true
      }
      showToast('Permissão de notificações não concedida')
      return false
    } catch {
      showToast('Não foi possível ativar as notificações')
      return false
    }
  }

  const configurarAlarmesExatos = async () => {
    try {
      await openExactAlarmSettings()
      await atualizarStatusNotificacoes()
      return true
    } catch {
      showToast('Não foi possível abrir a configuração de alarmes')
      return false
    }
  }

  const configurarTelaCheia = async () => {
    try {
      await openFullScreenAlarmSettings()
      await atualizarStatusNotificacoes()
      return true
    } catch {
      showToast('Não foi possível abrir a configuração de tela cheia')
      return false
    }
  }

  const testarNotificacao = async () => {
    try {
      const ok = await sendTestNotification()
      if (ok) showToast('✅ Notificação de teste enviada!')
      else showToast('Ative as notificações primeiro')
      return ok
    } catch {
      showToast('Falha ao testar a notificação')
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
  const showTopbar = tab !== 'home'

  return (
    <div className={styles.shell}>
      {showTopbar && (
        <div className={styles.topbar}>
          <button
            className={styles.brandButton}
            onClick={() => setTab('home')}
            aria-label="Voltar para o início"
          >
            <span className={styles.mark}>R</span>
            <span>RWS Remédios</span>
          </button>
          <button className={styles.iconBtn} onClick={carregar} title="Atualizar" aria-label="Atualizar dados">↻</button>
        </div>
      )}

      <main className={`${styles.content} ${!showTopbar ? styles.homeContent : ''}`}>
        {tab === 'home' && (
          <TabHome
            medicamentos={medicamentos}
            loading={loading}
            onOpenMeds={() => setTab('meds')}
            onRecarga={id => setModalMedId(id)}
          />
        )}
        {tab === 'meds' && (
          <TabMeds
            medicamentos={medicamentos}
            loading={loading}
            onRecarga={id => setModalMedId(id)}
            onRemover={removerMed}
            onAdd={() => setTab('add')}
          />
        )}
        {tab === 'add' && (
          <TabAdd onSalvar={salvarMed} showToast={showToast} />
        )}
        {tab === 'history' && <TabHistory />}
        {tab === 'config' && (
          <TabConfig
            notifAtiva={notifAtiva}
            exactAlarmStatus={exactAlarmStatus}
            fullScreenStatus={fullScreenStatus}
            nativeNotifications={nativeNotifications}
            onAtivarNotif={ativarNotificacoes}
            onConfigurarAlarmes={configurarAlarmesExatos}
            onConfigurarTelaCheia={configurarTelaCheia}
            onTestarNotif={testarNotificacao}
          />
        )}
      </main>

      {tab !== 'add' && <BottomNav tab={tab} onTab={setTab} />}

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
