import s from './BottomNav.module.css'

const TABS = [
  { id: 'meds',   icon: '💊', label: 'Remédios' },
  { id: 'add',    icon: '＋', label: 'Cadastrar' },
  { id: 'config', icon: '⚙️', label: 'Config' },
]

export default function BottomNav({ tab, onTab }) {
  return (
    <nav className={s.nav}>
      {TABS.map(t => (
        <button
          key={t.id}
          className={`${s.btn} ${tab === t.id ? s.active : ''}`}
          onClick={() => onTab(t.id)}
        >
          <span className={s.icon}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
