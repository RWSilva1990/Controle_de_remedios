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

export default function TabMeds({ medicamentos, loading, onRecarga, onRemover }) {
  if (loading) return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>⏳</div>
      <h3>Carregando...</h3>
    </div>
  )

  if (!medicamentos.length) return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>💊</div>
      <h3>Nenhum medicamento</h3>
      <p>Vá até <strong>Cadastrar</strong> para adicionar o primeiro.</p>
    </div>
  )

  // Summary chips
  const critico = medicamentos.filter(m => calcularEstoque(m) <= m.alerta).length
  const baixo   = medicamentos.filter(m => {
    const a = calcularEstoque(m)
    return a > m.alerta && a <= m.alerta * 2
  }).length

  return (
    <div>
      <div className={s.chips}>
        <span className={`${s.chip} ${s.chipOk}`}>{medicamentos.length} remédio{medicamentos.length !== 1 ? 's' : ''}</span>
        {critico > 0 && <span className={`${s.chip} ${s.chipDanger}`}>⚠️ {critico} crítico{critico !== 1 ? 's' : ''}</span>}
        {baixo   > 0 && <span className={`${s.chip} ${s.chipWarn}`}>⬇️ {baixo} baixo{baixo !== 1 ? 's' : ''}</span>}
      </div>

      {medicamentos.map(med => {
        const atual  = calcularEstoque(med)
        const pct    = Math.min(100, Math.round((atual / Math.max(med.total, 1)) * 100))
        const isCrit = atual <= med.alerta
        const isBaix = !isCrit && atual <= med.alerta * 2
        const cor    = isCrit ? 'var(--danger)' : isBaix ? 'var(--warn)' : 'var(--ok)'
        const prox   = proximaDose(med)

        return (
          <div key={med.id} className={`${s.card} ${isCrit ? s.cardCrit : isBaix ? s.cardBaix : ''}`}>
            <div className={s.cardLine} style={{ background: cor }} />

            <div className={s.header}>
              <div className={s.avatar}>{med.nome.charAt(0)}</div>
              <div className={s.meta}>
                <div className={s.nome}>{med.nome}</div>
                <div className={s.tags}>
                  {(med.configDoses || []).map((d, i) => (
                    <span key={i} className={s.tag}>{d.hora} · {d.qtd}cp</span>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.estoque}>
              <div className={s.estoqueRow}>
                <div>
                  <span className={s.estoqueNum} style={{ color: cor }}>{atual}</span>
                  <span className={s.estoqueLabel}> comprimidos</span>
                </div>
                <span
                  className={`${s.badge} ${isCrit ? s.badgeDanger : isBaix ? s.badgeWarn : s.badgeOk}`}
                >
                  {isCrit ? `⚠️ Crítico (mín ${med.alerta})` : isBaix ? `⬇️ Baixo (mín ${med.alerta})` : `✅ Normal (mín ${med.alerta})`}
                </span>
              </div>
              <div className={s.bar}>
                <div className={s.barFill} style={{ width: `${pct}%`, background: cor }} />
              </div>
            </div>

            {prox && (
              <div className={s.proxDose}>
                <span className={s.proxLabel}>Próxima dose</span>
                <span className={s.proxTime}>{prox}</span>
              </div>
            )}

            <div className={s.actions}>
              <button className={`${s.btn} ${s.btnOk}`} onClick={() => onRecarga(med.id)}>📦 Recarga</button>
              <button className={`${s.btn} ${s.btnDanger}`} onClick={() => onRemover(med.id, med.nome)}>🗑️ Remover</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
