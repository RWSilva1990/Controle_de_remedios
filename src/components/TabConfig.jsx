import { useState, useEffect } from 'react'
import s from './TabConfig.module.css'

export default function TabConfig({ onAtivarNotif, showToast }) {
  const [notifStatus, setNotifStatus] = useState('desconhecido')

  useEffect(() => {
    if ('Notification' in window) {
      setNotifStatus(Notification.permission)
    }
  }, [])

  const ativar = async () => {
    const ok = await onAtivarNotif()
    if (ok) setNotifStatus('granted')
  }

  const testar = async () => {
    try {
      const resp = await fetch('/api/disparar')
      const data = await resp.json()
      showToast(`✅ ${data.enviadas ?? 0} notificação(ões) enviadas`)
    } catch {
      showToast('Erro: /api/disparar não encontrado')
    }
  }

  const statusLabel = {
    granted: '✅ Ativadas',
    denied:  '🚫 Bloqueadas pelo sistema',
    default: '⏳ Aguardando permissão',
    desconhecido: '—'
  }[notifStatus] || '—'

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <div>
          <div className={s.label}>Notificações push</div>
          <div className={s.desc}>Alertas de dose e estoque mínimo</div>
        </div>
        <button
          className={`${s.btn} ${notifStatus === 'granted' ? s.btnActive : ''}`}
          onClick={ativar}
          disabled={notifStatus === 'denied'}
        >
          {notifStatus === 'granted' ? 'Ativado ✅' : 'Ativar'}
        </button>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Status das notificações</div>
          <div className={s.desc}>{statusLabel}</div>
        </div>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Testar verificador</div>
          <div className={s.desc}>Dispara o cron manualmente para teste</div>
        </div>
        <button className={s.btn} onClick={testar}>Testar</button>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Versão</div>
          <div className={s.desc}>RWS Remédios v2.0 — PWA React</div>
        </div>
      </div>

      <button
        className={s.btnLogout}
        onClick={() => window.location.reload()}
      >
        Sair
      </button>
    </div>
  )
}
