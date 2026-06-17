import { useState } from 'react'
import s from './ModalRecarga.module.css'

export default function ModalRecarga({ med, estoqueAtual, onConfirm, onClose }) {
  const [qtd, setQtd] = useState('')

  const confirmar = () => {
    const n = Number(qtd)
    if (!n || n <= 0) return
    onConfirm(n)
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.modal}>
        <h3 className={s.title}>📦 Recarga — {med.nome}</h3>
        <p className={s.desc}>
          Estoque atual: <strong>{estoqueAtual}</strong> comprimido(s).<br />
          Quantos você comprou agora?
        </p>
        <input
          className={s.input}
          type="number"
          placeholder="Ex: 60"
          min="1"
          value={qtd}
          onChange={e => setQtd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmar()}
          autoFocus
        />
        <div className={s.actions}>
          <button className={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={s.btnConfirm} onClick={confirmar}>Adicionar ao estoque</button>
        </div>
      </div>
    </div>
  )
}
