import { useEffect, useState } from 'react'
import s from './TabProfile.module.css'

const TIPOS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

async function imageToDataUrl(file) {
  const bitmap = await createImageBitmap(file)
  const size = 420
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function TabProfile({ profile, onSave, showToast }) {
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(profile), [profile])

  const set = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const changePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      set('foto', await imageToDataUrl(file))
    } catch {
      showToast('Não foi possível carregar a foto')
    }
  }

  const save = async () => {
    if (!form.nome?.trim()) {
      showToast('Informe seu nome')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      showToast('✅ Perfil salvo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.wrap}>
      <section className={s.header}>
        <span className={s.eyebrow}>Perfil</span>
        <h1>Seus dados</h1>
        <p>Essas informações ficam salvas no aparelho e ajudam a personalizar o RWS Remédios.</p>
      </section>

      <section className={s.card}>
        <div className={s.photoArea}>
          <div className={s.avatar}>
            {form.foto ? <img src={form.foto} alt="Foto do perfil" /> : <span>{form.nome?.trim()?.charAt(0)?.toUpperCase() || 'R'}</span>}
          </div>
          <label className={s.photoButton}>
            {form.foto ? 'Trocar foto' : 'Adicionar foto'}
            <input type="file" accept="image/*" onChange={changePhoto} />
          </label>
        </div>

        <div className={s.group}>
          <label>Nome</label>
          <input value={form.nome || ''} onChange={e => set('nome', e.target.value)} placeholder="Seu nome" />
        </div>

        <div className={s.grid}>
          <div className={s.group}>
            <label>Idade</label>
            <input type="number" min="0" max="120" value={form.idade ?? ''} onChange={e => set('idade', e.target.value)} placeholder="Ex.: 36" />
          </div>
          <div className={s.group}>
            <label>Tipo sanguíneo</label>
            <select value={form.tipoSanguineo || ''} onChange={e => set('tipoSanguineo', e.target.value)}>
              {TIPOS.map(tipo => <option key={tipo || 'none'} value={tipo}>{tipo || 'Selecione'}</option>)}
            </select>
          </div>
        </div>

        <div className={s.group}>
          <label>Telefone</label>
          <input type="tel" value={form.telefone || ''} onChange={e => set('telefone', e.target.value)} placeholder="(31) 99999-9999" />
        </div>

        <button className={s.save} onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</button>
      </section>
    </div>
  )
}
