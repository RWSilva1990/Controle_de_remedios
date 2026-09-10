import { useEffect, useMemo, useState } from 'react'
import { listMovements } from '../localDb'
import s from './TabHistory.module.css'

function formatDate(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function labelFor(item) {
  if (item.tipo === 'dose_confirmada') return 'Dose confirmada'
  if (item.tipo === 'dose_adiada') return 'Dose adiada'
  if (item.tipo === 'compra') return `Compra +${item.quantidade}`
  if (item.tipo === 'estoque_inicial') return `Estoque inicial ${item.quantidade}`
  if (item.tipo === 'medicamento_removido') return 'Medicamento removido'
  return item.tipo
}

export default function TabHistory() {
  const [mode, setMode] = useState('doses')
  const [items, setItems] = useState([])

  useEffect(() => {
    listMovements().then(setItems).catch(() => setItems([]))
  }, [])

  const filtered = useMemo(() => items.filter(item => {
    if (mode === 'compras') return item.tipo === 'compra' || item.tipo === 'estoque_inicial'
    return item.tipo === 'dose_confirmada' || item.tipo === 'dose_adiada'
  }), [items, mode])

  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <span className={s.eyebrow}>Histórico</span>
        <h1>Acompanhe sua rotina.</h1>
        <p>Doses e compras ficam registradas no próprio aparelho, mesmo sem internet.</p>
      </div>

      <div className={s.tabs} aria-label="Tipos de histórico">
        <button className={mode === 'doses' ? s.active : ''} onClick={() => setMode('doses')}>Doses</button>
        <button className={mode === 'compras' ? s.active : ''} onClick={() => setMode('compras')}>Compras</button>
      </div>

      {!filtered.length && (
        <div className={s.emptyCard}>
          <div className={s.icon}>◷</div>
          <strong>Nenhum registro ainda</strong>
          <p>
            {mode === 'doses'
              ? 'Quando você usar “Tomei” ou “Adiar” no alarme, os eventos aparecerão aqui.'
              : 'As compras e o estoque inicial dos medicamentos aparecerão aqui.'}
          </p>
        </div>
      )}

      {!!filtered.length && (
        <div className={s.list}>
          {filtered.map(item => (
            <div className={s.event} key={item.id}>
              <div>
                <strong>{item.medicamentoNome || 'Medicamento'}</strong>
                <span>{labelFor(item)}</span>
              </div>
              <time>{formatDate(item.ocorridoEm)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
