import { useState, useEffect, useCallback } from 'react'
import {
  initLocalDb,
  listMedications,
  markMedicationDeleted,
  recordMovement,
  saveMedication,
} from './localDb'
import { importFromFirebaseIfNeeded, syncPendingToFirebase } from './cloudSync'
import {
  getNotificationStatus,
  openExactAlarmSettings,
  requestNotificationPermission,
  scheduleMedicationNotifications,
  sendTestNotification,
} from './notifications'
import {
  consumeNativeAlarmActions,
  openFullScreenAlarmSettings,
} from './nativeAlarm'
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
      if (momento >= dataInicio && momento <= agora) consumido += Number(dose.qtd)
    })
    dia.setDate(dia.getDate() + 1)
  }
  return Math.max(0, med.total - consumido)
}

async function registrarAcoesPendentesDoAlarme() {
  try {
    const result = await consumeNativeAlarmActions()
    for (const action of result.actions || []) {
      const at = Number(action.at || Date.now())
      await recordMovement({
        id: `alarm-${action.medicationId}-${action.action}-${at}`,
        medicamentoId: action.medicationId || null,
        medicamentoNome: action.medicationName || 'Medicamento',
        tipo: action.action === 'taken' ? 'dose_confirmada' : 'dose_adiada',
        quantidade: Number(action.quantity || 0),
        ocorridoEm: new Date(at).toISOString(),
        detalhes: { origem: 'alarme_nativo' },
      })
    }
  } catch {
    // O uso do app não depende do processamento imediato do histórico do alarme.
  }
}

export default function App() {
  const [logado, setLogado] = useState(false)
  const [tab, setTab] = useState('home')
  const [editingId, setEditingId] = useState(null)
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

  const aplicarEstadoNavegacao = useCallback((state) => {
    setTab(state?.tab || 'home')
    setEditingId(state?.editingId || null)
    setModalMedId(state?.modalMedId || null)
  }, [])

  const navegar = useCallback((destino, extras = {}) => {
    const state = {
      rws: true,
      tab: destino,
      editingId: extras.editingId || null,
      modalMedId: extras.modalMedId || null,
    }
    window.history.pushState(state, '')
    aplicarEstadoNavegacao(state)
  }, [aplicarEstadoNavegacao])

  const abrirRecarga = useCallback((id) => {
    const state = { rws: true, tab, editingId: null, modalMedId: id }
    window.history.pushState(state, '')
    aplicarEstadoNavegacao(state)
  }, [tab, aplicarEstadoNavegacao])

  const fecharRecarga = useCallback(() => {
    if (modalMedId && window.history.state?.rws) window.history.back()
    else setModalMedId(null)
  }, [modalMedId])

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
      await initLocalDb()
      await registrarAcoesPendentesDoAlarme()

      let lista = await listMedications()
      if (!lista.length) {
        await importFromFirebaseIfNeeded()
        lista = await listMedications()
      }

      setMedicamentos(lista)

      try {
        await scheduleMedicationNotifications(lista, calcularEstoque)
      } catch {
        // Falha de agendamento não deve impedir o uso dos dados locais.
      }

      void syncPendingToFirebase()
    } catch {
      showToast('Erro ao acessar os dados locais')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (!logado) return undefined

    const initialState = { rws: true, tab: 'home', editingId: null, modalMedId: null }
    window.history.replaceState(initialState, '')
    aplicarEstadoNavegacao(initialState)

    const handlePopState = (event) => {
      if (event.state?.rws) aplicarEstadoNavegacao(event.state)
      else aplicarEstadoNavegacao(initialState)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [logado, aplicarEstadoNavegacao])

  useEffect(() => {
    if (!logado) return undefined

    atualizarStatusNotificacoes()
    carregar()

    const handleOnline = () => void syncPendingToFirebase()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        atualizarStatusNotificacoes()
        registrarAcoesPendentesDoAlarme().then(() => syncPendingToFirebase())
      }
    }

    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibility)
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

  const configurarPermissoesNecessarias = async () => {
    const status = await atualizarStatusNotificacoes()
    if (!status) return false
    if (status.display !== 'granted') return ativarNotificacoes()
    if (status.exactAlarm !== 'granted' && status.exactAlarm !== 'not-applicable') {
      showToast('Autorize o uso de alarmes exatos no Android')
      return configurarAlarmesExatos()
    }
    if (status.fullScreen !== 'granted' && status.fullScreen !== 'not-applicable') {
      showToast('Autorize os alarmes em tela cheia no Android')
      return configurarTelaCheia()
    }
    showToast('✅ Todas as permissões necessárias estão prontas')
    return true
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

  const salvarMed = async ({ id, modo, nome, total, alerta, dataCompra, configDoses }) => {
    try {
      if (modo === 'editar' && id) {
        const existente = medicamentos.find(m => m.id === id)
        if (!existente) throw new Error('Medicamento não encontrado')

        await saveMedication({
          ...existente,
          nome,
          alerta,
          configDoses,
          atualizadoEm: new Date().toISOString(),
        })
        await recordMovement({
          medicamentoId: id,
          medicamentoNome: nome,
          tipo: 'medicamento_editado',
          quantidade: 0,
          detalhes: { origem: 'edicao' },
        })
        showToast(`✅ ${nome} atualizado!`)
      } else {
        const novo = await saveMedication({
          nome,
          total,
          alerta,
          dataCompra,
          configDoses,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
        })
        await recordMovement({
          medicamentoId: novo.id,
          medicamentoNome: nome,
          tipo: 'estoque_inicial',
          quantidade: Number(total || 0),
          ocorridoEm: dataCompra || new Date().toISOString(),
        })
        showToast(`✅ ${nome} cadastrado!`)
      }

      await carregar()
      if (window.history.state?.rws) window.history.back()
      else aplicarEstadoNavegacao({ tab: 'meds' })
    } catch {
      showToast('Erro ao salvar localmente')
      throw new Error('Falha ao salvar medicamento localmente')
    }
  }

  const removerMed = async (id, nome) => {
    if (!window.confirm(`Remover ${nome}?`)) return
    try {
      await markMedicationDeleted(id)
      await recordMovement({
        medicamentoId: id,
        medicamentoNome: nome,
        tipo: 'medicamento_removido',
        quantidade: 0,
      })
      showToast(`🗑️ ${nome} removido`)
      await carregar()
    } catch {
      showToast('Erro ao remover localmente')
    }
  }

  const confirmarRecarga = async (id, qtd) => {
    const med = medicamentos.find(m => m.id === id)
    const estoqueAtual = calcularEstoque(med)
    try {
      await saveMedication({
        ...med,
        total: estoqueAtual + Number(qtd),
        dataCompra: new Date(Date.now() + 60000).toISOString(),
        atualizadoEm: new Date().toISOString(),
      })
      await recordMovement({
        medicamentoId: id,
        medicamentoNome: med.nome,
        tipo: 'compra',
        quantidade: Number(qtd),
      })
      showToast(`📦 +${qtd} comprimidos adicionados!`)
      await carregar()
      fecharRecarga()
    } catch {
      showToast('Erro ao registrar compra localmente')
    }
  }

  if (!logado) return <Login onLogin={handleLogin} />

  const medModal = medicamentos.find(m => m.id === modalMedId)
  const medEditando = medicamentos.find(m => m.id === editingId) || null
  const showTopbar = tab !== 'home'

  return (
    <div className={styles.shell}>
      {showTopbar && (
        <div className={styles.topbar}>
          <button
            className={styles.brandButton}
            onClick={() => navegar('home')}
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
            onOpenMeds={() => navegar('meds')}
            onRecarga={abrirRecarga}
          />
        )}
        {tab === 'meds' && (
          <TabMeds
            medicamentos={medicamentos}
            loading={loading}
            onRecarga={abrirRecarga}
            onRemover={removerMed}
            onEditar={id => navegar('add', { editingId: id })}
            onAdd={() => navegar('add')}
          />
        )}
        {tab === 'add' && (
          <TabAdd
            onSalvar={salvarMed}
            showToast={showToast}
            medicamento={medEditando}
            onCancelar={() => window.history.back()}
          />
        )}
        {tab === 'history' && <TabHistory />}
        {tab === 'config' && (
          <TabConfig
            notifAtiva={notifAtiva}
            exactAlarmStatus={exactAlarmStatus}
            fullScreenStatus={fullScreenStatus}
            nativeNotifications={nativeNotifications}
            onConfigurarPermissoes={configurarPermissoesNecessarias}
            onTestarNotif={testarNotificacao}
          />
        )}
      </main>

      {tab !== 'add' && <BottomNav tab={tab} onTab={destino => navegar(destino)} />}

      {medModal && (
        <ModalRecarga
          med={medModal}
          estoqueAtual={calcularEstoque(medModal)}
          onConfirm={(qtd) => confirmarRecarga(modalMedId, qtd)}
          onClose={fecharRecarga}
        />
      )}

      <Toast msg={toast} />
    </div>
  )
}
