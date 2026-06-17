import { useState, useEffect } from 'react'
import s from './TabAdd.module.css'

function dataPadrao() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 16)
}

export default function TabAdd({ onSalvar, showToast }) {
  const [nome,       setNome]       = useState('')
  const [total,      setTotal]      = useState('')
  const [alerta,     setAlerta]     = useState('')
  const [dataCompra, setDataCompra] = useState(dataPadrao)
  const [doses,      setDoses]      = useState([{ hora: '', qtd: '' }])
  const [salvando,   setSalvando]   = useState(false)

  const addDose = () => setDoses(d => [...d, { hora: '', qtd: '' }])
  const removeDose = (i) => setDoses(d => d.filter((_, idx) => idx !== i))
  const updateDose = (i, field, val) =>
    setDoses(d => d.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const salvar = async () => {
    if (!nome.trim() || !total || !alerta || !dataCompra) {
      showToast('Preencha todos os campos ✋')
      return
    }
    const dosesValidas = doses.filter(d => d.hora && d.qtd)
    if (!dosesValidas.length) {
      showToast('Adicione pelo menos um horário de dose')
      return
    }
    setSalvando(true)
    try {
      await onSalvar({
        nome: nome.trim().toUpperCase(),
        total: Number(total),
        alerta: Number(alerta),
        dataCompra,
        configDoses: dosesValidas
      })
      // Limpa o form
      setNome(''); setTotal(''); setAlerta(''); setDataCompra(dataPadrao())
      setDoses([{ hora: '', qtd: '' }])
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.section}>
        <div className={s.sectionTitle}>Identificação</div>
        <div className={s.group}>
          <label>Nome do medicamento</label>
          <input
            type="text"
            placeholder="Ex: LAMITOR 100mg"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Estoque inicial</div>
        <div className={s.grid2}>
          <div className={s.group}>
            <label>Quantidade comprada</label>
            <input type="number" placeholder="60" min="1" value={total} onChange={e => setTotal(e.target.value)} />
          </div>
          <div className={s.group}>
            <label>Alerta estoque mínimo</label>
            <input type="number" placeholder="10" min="1" value={alerta} onChange={e => setAlerta(e.target.value)} />
          </div>
        </div>
        <div className={s.group}>
          <label>Data/hora da compra</label>
          <input type="datetime-local" value={dataCompra} onChange={e => setDataCompra(e.target.value)} />
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionTitle}>Doses diárias</div>
        {doses.map((dose, i) => (
          <div key={i} className={s.doseRow}>
            <input
              type="time"
              value={dose.hora}
              onChange={e => updateDose(i, 'hora', e.target.value)}
            />
            <span className={s.sep}>·</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Qtd"
              value={dose.qtd}
              onChange={e => updateDose(i, 'qtd', e.target.value)}
              className={s.qtdInput}
            />
            <span className={s.sep}>cp</span>
            {doses.length > 1 && (
              <button className={s.removeBtn} onClick={() => removeDose(i)}>✕</button>
            )}
          </div>
        ))}
        <button className={s.addDoseBtn} onClick={addDose}>+ Adicionar horário</button>
      </div>

      <button className={s.saveBtn} onClick={salvar} disabled={salvando}>
        {salvando ? '⏳ Salvando...' : 'Salvar medicamento'}
      </button>
    </div>
  )
}
