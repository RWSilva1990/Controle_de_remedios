import { useState, useEffect } from 'react'
import s from './TabAdd.module.css'

function dataPadrao() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 16)
}

export default function TabAdd({ onSalvar, showToast, medicamento = null, onCancelar }) {
  const editando = Boolean(medicamento?.id)
  const [nome, setNome] = useState('')
  const [total, setTotal] = useState('')
  const [alerta, setAlerta] = useState('')
  const [dataCompra, setDataCompra] = useState(dataPadrao)
  const [doses, setDoses] = useState([{ hora: '', qtd: '' }])
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (medicamento) {
      setNome(medicamento.nome || '')
      setTotal('')
      setAlerta(String(medicamento.alerta ?? ''))
      const data = medicamento.dataCompra ? new Date(medicamento.dataCompra) : new Date()
      data.setMinutes(data.getMinutes() - data.getTimezoneOffset())
      setDataCompra(data.toISOString().slice(0, 16))
      setDoses((medicamento.configDoses || []).map(d => ({
        hora: d.hora || '',
        qtd: String(d.qtd ?? ''),
      })).length ? (medicamento.configDoses || []).map(d => ({
        hora: d.hora || '',
        qtd: String(d.qtd ?? ''),
      })) : [{ hora: '', qtd: '' }])
    } else {
      setNome('')
      setTotal('')
      setAlerta('')
      setDataCompra(dataPadrao())
      setDoses([{ hora: '', qtd: '' }])
    }
  }, [medicamento])

  const addDose = () => setDoses(d => [...d, { hora: '', qtd: '' }])
  const removeDose = (i) => setDoses(d => d.filter((_, idx) => idx !== i))
  const updateDose = (i, field, val) =>
    setDoses(d => d.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

  const salvar = async () => {
    if (!nome.trim() || !alerta || (!editando && (!total || !dataCompra))) {
      showToast('Preencha todos os campos obrigatórios')
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
        id: medicamento?.id || null,
        modo: editando ? 'editar' : 'novo',
        nome: nome.trim().toUpperCase(),
        total: editando ? null : Number(total),
        alerta: Number(alerta),
        dataCompra: editando ? medicamento.dataCompra : dataCompra,
        configDoses: dosesValidas.map(d => ({ hora: d.hora, qtd: Number(d.qtd) })),
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.pageIntro}>
        <span>{editando ? 'Editar medicamento' : 'Novo medicamento'}</span>
        <h1>{editando ? 'Ajuste o tratamento' : 'Cadastre um medicamento'}</h1>
        <p>
          {editando
            ? 'Altere nome, estoque mínimo ou horários. O estoque atual não será modificado aqui.'
            : 'Informe o estoque inicial e os horários para começar o acompanhamento.'}
        </p>
      </div>

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

      {editando ? (
        <div className={s.section}>
          <div className={s.sectionTitle}>Estoque</div>
          <div className={s.editStockNote}>
            <strong>O estoque não é alterado pela edição.</strong>
            <span>Use “Registrar compra” na tela de medicamentos para adicionar comprimidos.</span>
          </div>
          <div className={s.group}>
            <label>Alerta estoque mínimo</label>
            <input type="number" placeholder="10" min="1" value={alerta} onChange={e => setAlerta(e.target.value)} />
          </div>
        </div>
      ) : (
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
      )}

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
              <button type="button" className={s.removeBtn} onClick={() => removeDose(i)}>✕</button>
            )}
          </div>
        ))}
        <button type="button" className={s.addDoseBtn} onClick={addDose}>+ Adicionar horário</button>
      </div>

      <div className={s.formActions}>
        {onCancelar && (
          <button type="button" className={s.cancelBtn} onClick={onCancelar}>Cancelar</button>
        )}
        <button className={s.saveBtn} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar medicamento'}
        </button>
      </div>
    </div>
  )
}
