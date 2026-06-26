import { useState, useEffect } from 'react'
import s from './TabConfig.module.css'

export default function TabConfig({ notifAtiva, onAtivarNotif, showToast }) {
  const [perm, setPerm] = useState(Notification.permission)

  useEffect(() => {
    setPerm(Notification.permission)
  }, [notifAtiva])

  const ativar = async () => {
    const ok = await onAtivarNotif()
    if (ok) setPerm('granted')
  }

  const testar = () => {
    if (perm !== 'granted') { showToast('Ative as notificações primeiro'); return }
    new Notification('💊 Teste RWS Remédios', {
      body: 'As notificações estão funcionando!',
      icon: '/icon-192.png'
    })
    showToast('✅ Notificação de teste enviada!')
  }

  const statusLabel = {
    granted: '✅ Ativadas e funcionando',
    denied:  '🚫 Bloqueadas — libere nas configurações do Chrome',
    default: '⚪ Não ativadas ainda',
  }[perm] || '⚪ Não ativadas ainda'

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <div>
          <div className={s.label}>Notificações</div>
          <div className={s.desc}>Alarmes de dose e alerta de estoque</div>
        </div>
        <button
          className={`${s.btn} ${perm === 'granted' ? s.btnActive : ''}`}
          onClick={ativar}
          disabled={perm === 'granted' || perm === 'denied'}
        >
          {perm === 'granted' ? 'Ativado ✅' : perm === 'denied' ? 'Bloqueado' : 'Ativar'}
        </button>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Status</div>
          <div className={s.desc}>{statusLabel}</div>
        </div>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Testar notificação</div>
          <div className={s.desc}>Dispara uma notificação agora para verificar</div>
        </div>
        <button className={s.btn} onClick={testar}>Testar</button>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Como funciona</div>
          <div className={s.desc}>O app verifica as doses a cada minuto enquanto estiver aberto no celular. Mantenha o app aberto em segundo plano para receber os alarmes.</div>
        </div>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Versão</div>
          <div className={s.desc}>RWS Remédios v2.0 — PWA React</div>
        </div>
      </div>

      <button className={s.btnLogout} onClick={() => window.location.reload()}>
        Sair
      </button>
    </div>
  )
}
