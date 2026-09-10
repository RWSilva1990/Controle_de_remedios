import s from './TabHistory.module.css'

export default function TabHistory() {
  return (
    <div className={s.wrap}>
      <div className={s.header}>
        <span className={s.eyebrow}>Histórico</span>
        <h1>Acompanhe sua rotina.</h1>
        <p>As confirmações de doses e as compras registradas ficarão reunidas aqui.</p>
      </div>

      <div className={s.tabs} aria-label="Tipos de histórico">
        <button className={s.active}>Doses</button>
        <button>Compras</button>
      </div>

      <div className={s.emptyCard}>
        <div className={s.icon}>◷</div>
        <strong>Histórico preparado para a próxima etapa</strong>
        <p>
          A interface já está pronta. Na etapa funcional, os eventos “Tomei”, “Adiar” e
          “Registrar compra” passarão a alimentar esta tela automaticamente.
        </p>
      </div>
    </div>
  )
}
