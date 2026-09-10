import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'

const manifestPath = 'android/app/src/main/AndroidManifest.xml'
const javaDir = 'android/app/src/main/java/br/com/rwsilva/remedios'
const drawableDir = 'android/app/src/main/res/drawable'
const templatesDir = 'android-templates'

const permissions = [
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
]

let manifest = await readFile(manifestPath, 'utf8')
const manifestStart = manifest.indexOf('<manifest')
const manifestOpenEnd = manifest.indexOf('>', manifestStart)

if (manifestStart === -1 || manifestOpenEnd === -1) {
  throw new Error('AndroidManifest.xml inválido: tag <manifest> não encontrada.')
}

let permissionBlock = ''
for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    permissionBlock += `\n    <uses-permission android:name="${permission}" />`
  }
}

if (permissionBlock) {
  manifest = `${manifest.slice(0, manifestOpenEnd + 1)}${permissionBlock}${manifest.slice(manifestOpenEnd + 1)}`
}

const nativeComponents = `
        <activity
            android:name=".RwsAlarmActivity"
            android:exported="false"
            android:excludeFromRecents="true"
            android:launchMode="singleTop"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:theme="@android:style/Theme.Material.Light.NoActionBar" />
        <receiver
            android:name=".RwsAlarmReceiver"
            android:exported="false" />
        <receiver
            android:name=".RwsAlarmActionReceiver"
            android:exported="false" />`

if (!manifest.includes('.RwsAlarmActivity')) {
  const applicationEnd = manifest.indexOf('</application>')
  if (applicationEnd === -1) {
    throw new Error('AndroidManifest.xml inválido: tag </application> não encontrada.')
  }
  manifest = `${manifest.slice(0, applicationEnd)}${nativeComponents}\n    ${manifest.slice(applicationEnd)}`
}

manifest = manifest.replace(/android:icon="[^"]+"/, 'android:icon="@drawable/rws_app_icon"')
manifest = manifest.replace(/android:roundIcon="[^"]+"/, 'android:roundIcon="@drawable/rws_app_icon"')

await writeFile(manifestPath, manifest, 'utf8')

await mkdir(javaDir, { recursive: true })
const javaFiles = [
  'RwsAlarmPlugin.java',
  'RwsAlarmScheduler.java',
  'RwsAlarmActions.java',
  'RwsAlarmReceiver.java',
  'RwsAlarmActionReceiver.java',
  'RwsAlarmActivity.java',
]

for (const file of javaFiles) {
  await copyFile(`${templatesDir}/${file}`, `${javaDir}/${file}`)
}

await mkdir(drawableDir, { recursive: true })
await copyFile('public/icon-512.png', `${drawableDir}/rws_app_icon.png`)

const mainActivity = `package br.com.rwsilva.remedios;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(RwsAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`

await writeFile(`${javaDir}/MainActivity.java`, mainActivity, 'utf8')
console.log('Android configurado com alarmes nativos e ícone RWS Remédios.')
