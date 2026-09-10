import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import {
  getFullScreenAlarmStatus,
  scheduleNativeDoseAlarms,
} from './nativeAlarm'

const DOSE_CHANNEL = 'rws-medication-reminders'
const STOCK_CHANNEL = 'rws-stock-alerts'
const ALERT_KEY_PREFIX = 'rws-stock-alert:'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

function stableId(seed, offset = 0) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  return offset + (Math.abs(hash) % 900000)
}

function stockId(medId) {
  return stableId(`${medId}:stock`, 2000000)
}

async function ensureAndroidChannels() {
  if (Capacitor.getPlatform() !== 'android') return

  await LocalNotifications.createChannel({
    id: DOSE_CHANNEL,
    name: 'Lembretes de medicamentos',
    description: 'Avisos dos horários cadastrados para tomar medicamentos.',
    importance: 4,
    vibration: true,
  })

  await LocalNotifications.createChannel({
    id: STOCK_CHANNEL,
    name: 'Alertas de estoque',
    description: 'Avisos quando um medicamento atinge o estoque mínimo.',
    importance: 4,
    vibration: true,
  })
}

export async function getNotificationStatus() {
  if (!isNativeApp()) {
    return {
      display: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
      exactAlarm: 'not-applicable',
      fullScreen: 'not-applicable',
      native: false,
    }
  }

  const permission = await LocalNotifications.checkPermissions()
  let exactAlarm = 'granted'
  let fullScreen = 'granted'

  if (Capacitor.getPlatform() === 'android') {
    const exact = await LocalNotifications.checkExactNotificationSetting()
    exactAlarm = exact.exact_alarm
    const full = await getFullScreenAlarmStatus()
    fullScreen = full.granted ? 'granted' : 'denied'
  }

  return {
    display: permission.display,
    exactAlarm,
    fullScreen,
    native: true,
  }
}

export async function requestNotificationPermission() {
  if (!isNativeApp()) {
    if (typeof Notification === 'undefined') return 'denied'
    return Notification.requestPermission()
  }

  const result = await LocalNotifications.requestPermissions()
  if (result.display === 'granted') {
    try {
      await ensureAndroidChannels()
    } catch {
      // A permissão já foi concedida. Falha ao criar canal não deve ser reportada como recusa.
    }
  }
  return result.display
}

export async function openExactAlarmSettings() {
  if (!isNativeApp() || Capacitor.getPlatform() !== 'android') return 'granted'
  const result = await LocalNotifications.changeExactNotificationSetting()
  return result.exact_alarm
}

function startBrowserScheduler(medicamentos, calcularEstoque) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (window._alarmeInterval) clearInterval(window._alarmeInterval)

  window._alarmeInterval = setInterval(() => {
    const agora = new Date()
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`

    medicamentos.forEach(med => {
      const estoque = calcularEstoque(med, agora)
      ;(med.configDoses || []).forEach(dose => {
        if (dose.hora !== horaAtual) return

        new Notification(`💊 ${med.nome}`, {
          body: `Tome agora ${dose.qtd} comprimido(s).`,
          icon: '/icon-192.png',
          tag: `dose-${med.id}-${horaAtual}`,
        })

        const estoqueApos = Math.max(0, estoque - Number(dose.qtd))
        if (estoqueApos <= Number(med.alerta || 0)) {
          new Notification(`Estoque baixo — ${med.nome}`, {
            body: `Restam aproximadamente ${estoqueApos} comprimido(s). Providencie uma nova compra.`,
            icon: '/icon-192.png',
            tag: `alerta-${med.id}`,
          })
        }
      })
    })
  }, 60000)
}

function nextStockAlert(med, calcularEstoque, agora = new Date()) {
  const alerta = Number(med.alerta || 0)
  let estoque = calcularEstoque(med, agora)
  const doses = (med.configDoses || [])
    .filter(dose => dose.hora && Number(dose.qtd) > 0)
    .map(dose => {
      const [hour, minute] = dose.hora.split(':').map(Number)
      return { hour, minute, qtd: Number(dose.qtd) }
    })
    .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute))

  if (!doses.length) return null

  if (estoque <= alerta) return { at: new Date(agora.getTime() + 10000), remaining: estoque }

  const cursor = new Date(agora)
  cursor.setSeconds(0, 0)

  for (let dayOffset = 0; dayOffset < 3650; dayOffset += 1) {
    for (const dose of doses) {
      const momento = new Date(cursor)
      momento.setDate(cursor.getDate() + dayOffset)
      momento.setHours(dose.hour, dose.minute, 0, 0)
      if (momento <= agora) continue

      estoque = Math.max(0, estoque - dose.qtd)
      if (estoque <= alerta) return { at: new Date(momento.getTime() + 5000), remaining: estoque }
    }
  }

  return null
}

function getStoredStockAlert(med) {
  try {
    const raw = localStorage.getItem(`${ALERT_KEY_PREFIX}${med.id}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.cycle !== med.dataCompra) return null
    return data
  } catch {
    return null
  }
}

function storeStockAlert(med, at) {
  try {
    localStorage.setItem(`${ALERT_KEY_PREFIX}${med.id}`, JSON.stringify({
      cycle: med.dataCompra,
      scheduledAt: at.toISOString(),
    }))
  } catch {
    // O agendamento nativo continua funcionando mesmo se o armazenamento local falhar.
  }
}

export async function scheduleMedicationNotifications(medicamentos, calcularEstoque) {
  if (!isNativeApp()) {
    startBrowserScheduler(medicamentos, calcularEstoque)
    return { native: false }
  }

  const permission = await LocalNotifications.checkPermissions()
  if (permission.display !== 'granted') return { native: true, scheduled: false }

  await ensureAndroidChannels()

  const pending = await LocalNotifications.getPending()
  const ours = pending.notifications.filter(item => item.id >= 1000000 && item.id < 3000000)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(item => ({ id: item.id })) })

  await scheduleNativeDoseAlarms(medicamentos)

  const notifications = []

  medicamentos.forEach(med => {
    const stored = getStoredStockAlert(med)
    if (stored) {
      const at = new Date(stored.scheduledAt)
      if (at > new Date()) {
        const projected = nextStockAlert(med, calcularEstoque)
        if (projected) {
          notifications.push({
            id: stockId(med.id),
            title: `Estoque baixo — ${med.nome}`,
            body: `O estoque está chegando ao mínimo de ${med.alerta} comprimido(s). Providencie uma nova compra.`,
            channelId: STOCK_CHANNEL,
            schedule: { at, allowWhileIdle: true },
            extra: { source: 'rws-remedios', type: 'stock', medicationId: med.id },
          })
        }
      }
      return
    }

    const projected = nextStockAlert(med, calcularEstoque)
    if (!projected) return

    notifications.push({
      id: stockId(med.id),
      title: `Estoque baixo — ${med.nome}`,
      body: `Restarão aproximadamente ${projected.remaining} comprimido(s). Providencie uma nova compra.`,
      channelId: STOCK_CHANNEL,
      schedule: { at: projected.at, allowWhileIdle: true },
      extra: { source: 'rws-remedios', type: 'stock', medicationId: med.id },
    })
    storeStockAlert(med, projected.at)
  })

  if (notifications.length) await LocalNotifications.schedule({ notifications })

  return { native: true, scheduled: true, stockCount: notifications.length }
}

export async function sendTestNotification() {
  if (!isNativeApp()) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
    new Notification('RWS Remédios', {
      body: 'As notificações estão funcionando.',
      icon: '/icon-192.png',
    })
    return true
  }

  const permission = await LocalNotifications.checkPermissions()
  if (permission.display !== 'granted') return false

  await ensureAndroidChannels()
  await LocalNotifications.schedule({
    notifications: [{
      id: 900001,
      title: 'RWS Remédios',
      body: 'As notificações nativas estão funcionando.',
      channelId: DOSE_CHANNEL,
      schedule: { at: new Date(Date.now() + 1500) },
    }],
  })
  return true
}
