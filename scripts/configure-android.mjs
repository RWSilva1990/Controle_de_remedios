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
const appIconVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="512"
    android:viewportHeight="512">
    <path
        android:fillColor="#168DDE"
        android:pathData="M72,8 H440 Q504,8 504,72 V440 Q504,504 440,504 H72 Q8,504 8,440 V72 Q8,8 72,8 Z" />
    <path
        android:fillColor="#33C9D0"
        android:fillAlpha="0.55"
        android:pathData="M72,8 H284 V504 H72 Q8,504 8,440 V72 Q8,8 72,8 Z" />
    <group
        android:pivotX="190"
        android:pivotY="250"
        android:rotation="-45">
        <path
            android:fillColor="#E7FBFF"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="12"
            android:pathData="M190,105 C150,105 118,137 118,177 L118,323 C118,363 150,395 190,395 C230,395 262,363 262,323 L262,177 C262,137 230,105 190,105 Z" />
        <path
            android:fillColor="@android:color/transparent"
            android:strokeColor="#168DDE"
            android:strokeWidth="18"
            android:pathData="M118,250 L262,250" />
    </group>
    <path
        android:fillColor="#0D70C9"
        android:strokeColor="#FFFFFF"
        android:strokeWidth="15"
        android:pathData="M338,245 A92,92 0,1 0,338 429 A92,92 0,1 0,338 245" />
    <path
        android:fillColor="@android:color/transparent"
        android:strokeColor="#FFFFFF"
        android:strokeWidth="15"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M338,286 L338,340 L375,363" />
    <path android:fillColor="#FFFFFF" android:pathData="M338,263 A7,7 0,1 0,338 277 A7,7 0,1 0,338 263" />
    <path android:fillColor="#FFFFFF" android:pathData="M405,330 A7,7 0,1 0,405 344 A7,7 0,1 0,405 330" />
    <path android:fillColor="#FFFFFF" android:pathData="M338,397 A7,7 0,1 0,338 411 A7,7 0,1 0,338 397" />
    <path android:fillColor="#FFFFFF" android:pathData="M271,330 A7,7 0,1 0,271 344 A7,7 0,1 0,271 330" />
</vector>
`
await writeFile(`${drawableDir}/rws_app_icon.xml`, appIconVector, 'utf8')

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
console.log('Android configurado com alarmes nativos e ícone cápsula + relógio arredondado.')
