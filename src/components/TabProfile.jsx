import { useEffect, useRef, useState } from 'react'
import s from './TabProfile.module.css'

const TIPOS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

async function cropImageToSquare(src, x, y, zoom) {
  const image = new Image()
  image.src = src
  await image.decode()

  const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom
  const maxX = Math.max(0, image.naturalWidth - cropSize)
  const maxY = Math.max(0, image.naturalHeight - cropSize)
  const sx = maxX * (x / 100)
  const sy = maxY * (y / 100)

  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 420
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, 420, 420)
  return canvas.toDataURL('image/jpeg', 0.84)
}

export default function TabProfile({ profile, onSave, showToast }) {
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)
  const [cropSrc, setCropSrc] = useState('')
  const [cropX, setCropX] = useState(50)
  const [cropY, setCropY] = useState(50)
  const [zoom, setZoom] = useState(1)
  const dragRef = useRef(null)

  useEffect(() => setForm(profile), [profile])

  const set = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const changePhoto = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast('Escolha uma foto de até 15 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(String(reader.result || ''))
      setCropX(50)
      setCropY(50)
      setZoom(1)
    }
    reader.onerror = () => showToast('Não foi possível carregar a foto')
    reader.readAsDataURL(file)
  }

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { px: event.clientX, py: event.clientY, x: cropX, y: cropY }
  }

  const onPointerMove = (event) => {
    if (!dragRef.current) return
    const box = event.currentTarget.getBoundingClientRect()
    const dx = ((event.clientX - dragRef.current.px) / Math.max(1, box.width)) * 100
    const dy = ((event.clientY - dragRef.current.py) / Math.max(1, box.height)) * 100
    setCropX(clamp(dragRef.current.x - dx / Math.max(1, zoom), 0, 100))
    setCropY(clamp(dragRef.current.y - dy / Math.max(1, zoom), 0, 100))
  }

  const endDrag = () => { dragRef.current = null }

  const applyCrop = async () => {
    try {
      const cropped = await cropImageToSquare(cropSrc, cropX, cropY, zoom)
      set('foto', cropped)
      setCropSrc('')
    } catch {
      showToast('Não foi possível recortar a foto')
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

      {cropSrc && (
        <div className={s.cropOverlay} role="dialog" aria-modal="true" aria-label="Ajustar foto do perfil">
          <div className={s.cropModal}>
            <div className={s.cropHeader}>
              <div>
                <span>Ajustar foto</span>
                <strong>Escolha o enquadramento</strong>
              </div>
              <button onClick={() => setCropSrc('')} aria-label="Cancelar recorte">×</button>
            </div>

            <div
              className={s.cropStage}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                src={cropSrc}
                alt="Pré-visualização do recorte"
                draggable="false"
                style={{
                  objectPosition: `${cropX}% ${cropY}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: `${cropX}% ${cropY}%`,
                }}
              />
              <div className={s.cropFrame} />
            </div>

            <p className={s.cropHint}>Arraste a foto para posicionar o rosto dentro do quadro.</p>
            <label className={s.zoomRow}>
              <span>Zoom</span>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
            </label>

            <div className={s.cropActions}>
              <button className={s.cropCancel} onClick={() => setCropSrc('')}>Cancelar</button>
              <button className={s.cropApply} onClick={applyCrop}>Usar esta foto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
