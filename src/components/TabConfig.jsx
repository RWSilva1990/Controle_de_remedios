import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import s from './TabConfig.module.css'

export default function TabConfig({ onAtivarNotif, showToast }) {
  const [status, setStatus] = useState('verificando') // verificando | ativo | inativo | bloqueado

  useEffect(() => {
    verificarStatus()
  }, [])

  const verificarStatus = async () => {
    if (!('Notification' in window)) {
      setStatus('inativo')
      return
    }
    const perm = Notification.permission
    if (perm === 'denied') {
      setStatus('bloqueado')
      return
    }
    if (perm === 'granted') {
      // Verifica se o token está salvo no Firestore
      try {
        const snap = await getDoc(doc(db, 'tokens', 'usuario_principal'))
        if (snap.exists() && snap.data().token) {
          setStatus('ativo')
        } else {
          setStatus('inativo')
        }
      } catch {
        setStatus('inativo')
      }
    } else {
      setStatus('inativo')
    }
  }

  const ativar = async () => {
    setStatus('verificando')
    const ok = await onAtivarNotif()
    if (ok) {
      setStatus('ativo')
    } else {
      setStatus('inativo')
    }
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

  const statusInfo = {
    verificando: { label: '⏳ Verificando...', btn: '...', disabled: true },
    ativo:       { label: '✅ Ativadas e funcionando', btn: 'Ativado ✅', disabled: true },
    inativo:     { label: '⚪ Não ativadas', btn: 'Ativar', disabled: false },
    bloqueado:   { label: '🚫 Bloqueadas — libere nas configurações do Chrome', btn: 'Bloqueado', disabled: true },
  }[status]

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <div>
          <div className={s.label}>Notificações push</div>
          <div className={s.desc}>Alertas de dose e estoque mínimo</div>
        </div>
        <button
          className={`${s.btn} ${status === 'ativo' ? s.btnActive : ''}`}
          onClick={ativar}
          disabled={statusInfo.disabled}
        >
          {statusInfo.btn}
        </button>
      </div>

      <div className={s.row}>
        <div>
          <div className={s.label}>Status das notificações</div>
          <div className={s.desc}>{statusInfo.label}</div>
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

      <button className={s.btnLogout} onClick={() => window.location.reload()}>
        Sair
      </button>
    </div>
  )
}
