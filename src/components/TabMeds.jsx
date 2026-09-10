import { calcularEstoque } from '../App'
import s from './TabMeds.module.css'

function proximaDose(med) {
  const agora = new Date()
  const hm = agora.getHours() * 60 + agora.getMinutes()
  const doses = [...(med.configDoses || [])].sort((a, b) => {
    const [ah, am] = a.hora.split(':').map(Number)
    const [bh, bm] = b.hora.split(':').map(Number)
    return (ah * 60 + am) - (bh * 60 + bm)
  })
  for (const dose of doses) {
    const [h, m] = dose.hora.split(':').map(Number)
    if (h * 60 + m > hm) return dose.hora
  }
  return doses[0]?.hora || null
}

function diasRestantes(med) {
  const consumoDia = (med.configDoses || []).reduce((total, dose) => total + Number(dose.qtd || 0), 0)
  if (!consumoDia) return null
  return Math.floor(calcularEstoque(med) / consumoDia)
}

export default function TabMeds({ medicamentos, loading, onRecarga, onRemover, onEditar, onAdd }) {
  if (loading) return <div className={s.empty}>Carregando medicamentos...</div>

  const critico = medicamentos.filter(m => calcularEstoque(m) <= Number(m.alerta || 0)).length

  return (
    <div className={s.wrap}>
      <div className={s.pageHeader}>
        <div>
          <span className={s.eyebrow}>Medicamentos</span>
          <h1>Seus medicamentos</h1>
          <p>Estoque, horários e próximas doses em um só lugar.</p>
        </div>
        <button className={s.addButton} onClick={onAdd} aria-label="Adicionar medicamento">+</button>
      </div>

      <div className={s.summary}>
        <span>{medicamentos.length} cadastrado{medicamentos.length !== 1 ? 's' : ''}</span>
        <span className={critico ? s.summaryDanger : ''}>{critico} com estoque baixo</span>
      </div>

      {!medicamentos.length ? (
        <div className={s.emptyCard}>
          <div className={s.emptyIcon}>+</div>
          <strong>Nenhum medicamento cadastrado</strong>
          <p>Adicione o primeiro medicamento para começar a acompanhar doses e estoque.</p>
          <button onClick={onAdd}>Adicionar medicamento</button>
        </div>
      ) : (
        <div className={s.list}>
          {medicamentos.map(med => {
            const atual = calcularEstoque(med)
            const isCrit = atual <= Number(med.alerta || 0)
            const prox = proximaDose(med)
            const dias = diasRestantes(med)

            return (
              <article key={med.id} className={s.card}>
                <div className={s.cardTop}>
                  <div className={s.avatar}>{med.nome.charAt(0)}</div>
                  <div className={s.meta}>
                    <div className={s.nameRow}>
                      <h2>{med.nome}</h2>
                      <span className={isCrit ? s.badgeDanger : s.badgeOk}>
                        {isCrit ? 'Estoque baixo' : 'Estoque OK'}
                      </span>
                    </div>
                    <p>{prox ? `Próxima dose às ${prox}` : 'Sem horário cadastrado'}</p>
                  </div>
                </div>

                <div className={s.stockRow}>
                  <div>
                    <span>Estoque atual</span>
                    <strong>{atual}</strong>
                    <small>comprimidos</small>
                  </div>
                  <div>
                    <span>Estoque mínimo</span>
                    <strong>{med.alerta}</strong>
                    <small>comprimidos</small>
                  </div>
                  <div>
                    <span>Previsão</span>
                    <strong>{dias === null ? '—' : dias}</strong>
                    <small>{dias === 1 ? 'dia' : 'dias'}</small>
                  </div>
                </div>

                <div className={s.doses}>
                  {(med.configDoses || []).map((dose, i) => (
                    <span key={i}>{dose.hora} · {dose.qtd} cp</span>
                  ))}
                </div>

                <div className={s.actions}>
                  <button className={s.buyButton} onClick={() => onRecarga(med.id)}>Registrar compra</button>
                  <button className={s.editButton} onClick={() => onEditar(med.id)}>Editar</button>
                  <button className={s.removeButton} onClick={() => onRemover(med.id, med.nome)}>Remover</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
