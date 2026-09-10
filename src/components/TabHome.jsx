import { calcularEstoque } from '../App'
import s from './TabHome.module.css'

function minutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function montarAgenda(medicamentos) {
  const agora = new Date()
  const atual = agora.getHours() * 60 + agora.getMinutes()
  return medicamentos
    .flatMap(med => (med.configDoses || []).map(dose => ({
      medId: med.id,
      nome: med.nome,
      hora: dose.hora,
      qtd: Number(dose.qtd),
      passou: minutos(dose.hora) <= atual,
    })))
    .sort((a, b) => minutos(a.hora) - minutos(b.hora))
}

function previsaoDias(med) {
  const estoque = calcularEstoque(med)
  const consumoDia = (med.configDoses || []).reduce((soma, dose) => soma + Number(dose.qtd || 0), 0)
  if (!consumoDia) return null
  return Math.floor(estoque / consumoDia)
}

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function TabHome({ medicamentos, loading, onOpenMeds, onRecarga, profile, onOpenProfile }) {
  if (loading) return <div className={s.loading}>Carregando sua rotina...</div>

  const agenda = montarAgenda(medicamentos)
  const proxima = agenda.find(item => !item.passou) || null
  const criticos = medicamentos.filter(med => calcularEstoque(med) <= Number(med.alerta || 0))
  const restantes = agenda.filter(item => !item.passou).length
  const nome = profile?.nome?.trim()
  const primeiroNome = nome ? nome.split(/\s+/)[0] : ''

  return (
    <div className={s.wrap}>
      <section className={s.hero}>
        <div className={s.heroTop}>
          <div>
            <span className={s.brand}>RWS Remédios</span>
            <h1>{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
            <p>{primeiroNome ? 'Veja como está sua rotina de medicamentos hoje.' : 'Complete seu perfil para personalizar sua experiência.'}</p>
          </div>
          <button className={s.avatarButton} onClick={onOpenProfile} aria-label="Abrir perfil">
            {profile?.foto ? <img src={profile.foto} alt="" /> : <span>{primeiroNome?.charAt(0)?.toUpperCase() || 'R'}</span>}
          </button>
        </div>

        <div className={s.heroGlowOne} />
        <div className={s.heroGlowTwo} />
      </section>

      <section className={s.nextCard}>
        <div>
          <span className={s.cardLabel}>Próxima dose</span>
          {proxima ? (
            <>
              <strong className={s.nextTime}>{proxima.hora}</strong>
              <h2>{proxima.nome}</h2>
              <p>{proxima.qtd} comprimido{proxima.qtd !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <>
              <strong className={s.doneTitle}>Tudo certo por hoje</strong>
              <p>Não há outras doses programadas para hoje.</p>
            </>
          )}
        </div>
        <div className={s.pillIcon}>✦</div>
      </section>

      <section className={s.metrics}>
        <div className={s.metric}>
          <span>Doses hoje</span>
          <strong>{agenda.length}</strong>
          <small>{restantes} restante{restantes !== 1 ? 's' : ''}</small>
        </div>
        <div className={`${s.metric} ${criticos.length ? s.metricAlert : ''}`}>
          <span>Estoque baixo</span>
          <strong>{criticos.length}</strong>
          <small>{criticos.length === 1 ? 'medicamento' : 'medicamentos'}</small>
        </div>
        <div className={s.metric}>
          <span>Ativos</span>
          <strong>{medicamentos.length}</strong>
          <small>cadastrados</small>
        </div>
      </section>

      {criticos.length > 0 && (
        <section className={s.alertBox}>
          <div>
            <span className={s.alertTitle}>Atenção ao estoque</span>
            {criticos.slice(0, 2).map(med => {
              const estoque = calcularEstoque(med)
              const dias = previsaoDias(med)
              return (
                <div key={med.id} className={s.alertItem}>
                  <div>
                    <strong>{med.nome}</strong>
                    <span>{estoque} comprimidos{dias !== null ? ` · cerca de ${dias} dia${dias !== 1 ? 's' : ''}` : ''}</span>
                  </div>
                  <button onClick={() => onRecarga(med.id)}>Registrar compra</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className={s.timelineSection}>
        <div className={s.sectionHeader}>
          <div>
            <span className={s.sectionEyebrow}>Hoje</span>
            <h2>Próximas doses</h2>
          </div>
          <button onClick={onOpenMeds}>Ver medicamentos</button>
        </div>

        {agenda.length ? (
          <div className={s.timeline}>
            {agenda.map((item, index) => (
              <div key={`${item.medId}-${item.hora}-${index}`} className={`${s.timelineItem} ${item.passou ? s.past : ''}`}>
                <span className={s.dot} />
                <time>{item.hora}</time>
                <div>
                  <strong>{item.nome}</strong>
                  <span>{item.qtd} comprimido{item.qtd !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={s.empty}>Nenhuma dose cadastrada para hoje.</div>
        )}
      </section>
    </div>
  )
}
