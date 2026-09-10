import { Capacitor, registerPlugin } from '@capacitor/core'

const RwsAlarm = registerPlugin('RwsAlarm')

export function hasNativeAlarm() {
  return Capacitor.getPlatform() === 'android'
}

export async function scheduleNativeDoseAlarms(medicamentos) {
  if (!hasNativeAlarm()) return { native: false }

  const alarms = []
  medicamentos.forEach(med => {
    ;(med.configDoses || []).forEach((dose, index) => {
      if (!dose.hora || !Number(dose.qtd)) return
      const [hour, minute] = dose.hora.split(':').map(Number)
      alarms.push({
        id: stableAlarmId(`${med.id}:${index}`),
        medicationId: med.id,
        medicationName: med.nome,
        doseIndex: index,
        quantity: Number(dose.qtd),
        hour,
        minute,
      })
    })
  })

  return RwsAlarm.schedule({ alarms })
}

export async function getFullScreenAlarmStatus() {
  if (!hasNativeAlarm()) return { supported: false, granted: false }
  return RwsAlarm.getFullScreenStatus()
}

export async function openFullScreenAlarmSettings() {
  if (!hasNativeAlarm()) return { opened: false }
  return RwsAlarm.openFullScreenSettings()
}

export async function consumeNativeAlarmActions() {
  if (!hasNativeAlarm()) return { actions: [] }
  return RwsAlarm.consumeActions()
}

function stableAlarmId(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    hash |= 0
  }
  return 3000000 + (Math.abs(hash) % 900000)
}
