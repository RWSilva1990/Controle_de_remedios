import { readFile, writeFile } from 'node:fs/promises'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const exactAlarmPermission = '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />'

let manifest = await readFile(manifestPath, 'utf8')

if (!manifest.includes('android.permission.SCHEDULE_EXACT_ALARM')) {
  const manifestStart = manifest.indexOf('<manifest')
  const manifestOpenEnd = manifest.indexOf('>', manifestStart)

  if (manifestStart === -1 || manifestOpenEnd === -1) {
    throw new Error('AndroidManifest.xml inválido: tag <manifest> não encontrada.')
  }

  manifest = `${manifest.slice(0, manifestOpenEnd + 1)}\n${exactAlarmPermission}${manifest.slice(manifestOpenEnd + 1)}`
  await writeFile(manifestPath, manifest, 'utf8')
  console.log('Permissão SCHEDULE_EXACT_ALARM adicionada ao AndroidManifest.xml.')
} else {
  console.log('Permissão SCHEDULE_EXACT_ALARM já está configurada.')
}
