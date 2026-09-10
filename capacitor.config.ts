import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.rwsilva.remedios',
  appName: 'RWS Remédios',
  webDir: 'dist',
  backgroundColor: '#F6F8FB',
  android: {
    backgroundColor: '#F6F8FB'
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list']
    }
  }
}

export default config
