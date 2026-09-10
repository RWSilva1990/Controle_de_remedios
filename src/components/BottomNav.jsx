import s from './BottomNav.module.css'

const TABS = [
  { id: 'home', icon: '⌂', label: 'Início' },
  { id: 'meds', icon: '✚', label: 'Medicamentos' },
  { id: 'history', icon: '◷', label: 'Histórico' },
  { id: 'config', icon: '⚙', label: 'Ajustes' },
]

export default function BottomNav({ tab, onTab }) {
  return (
    <nav className={s.nav}>
      {TABS.map(t => (
        <button
          key={t.id}
          className={`${s.btn} ${tab === t.id ? s.active : ''}`}
          onClick={() => onTab(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <span className={s.icon}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
