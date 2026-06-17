import { useState } from 'react'
import s from './Login.module.css'

export default function Login({ onLogin }) {
  const [senha, setSenha] = useState('')

  const tentar = () => {
    onLogin(senha)
    setSenha('')
  }

  return (
    <div className={s.screen}>
      <div className={s.box}>
        <div className={s.logo}>💊</div>
        <h1 className={s.title}>RWS Remédios</h1>
        <p className={s.sub}>Controle de medicamentos pessoal</p>
        <input
          className={s.input}
          type="password"
          placeholder="••••••"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tentar()}
          autoFocus
        />
        <button className={s.btn} onClick={tentar}>Entrar</button>
      </div>
    </div>
  )
}
