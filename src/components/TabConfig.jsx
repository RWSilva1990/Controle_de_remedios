import s from './TabConfig.module.css'

export default function TabConfig({
  notifAtiva,
  exactAlarmStatus,
  fullScreenStatus,
  nativeNotifications,
  onConfigurarPermissoes,
  onTestarNotif,
}) {
  const exactGranted = exactAlarmStatus === 'granted' || exactAlarmStatus === 'not-applicable'
  const fullScreenGranted = fullScreenStatus === 'granted' || fullScreenStatus === 'not-applicable'
  const permissionsReady = notifAtiva && exactGranted && fullScreenGranted

  let permissionText = 'Tudo pronto para alarmes e notificações'
  if (!notifAtiva) permissionText = 'Configuração incompleta — autorize as notificações'
  else if (!exactGranted) permissionText = 'Configuração incompleta — autorize horários exatos'
  else if (!fullScreenGranted) permissionText = 'Configuração incompleta — autorize alarmes em tela cheia'

  return (
    <div className={s.wrap}>
      <section className={s.intro}>
        <span className={s.eyebrow}>Ajustes</span>
        <h1>Alarmes e preferências</h1>
        <p>O RWS Remédios verifica automaticamente as permissões necessárias para avisar você com segurança.</p>
      </section>

      <div className={s.card}>
        <div className={s.row}>
          <div>
            <div className={s.label}>Permissões necessárias</div>
            <div className={s.desc}>{permissionText}</div>
          </div>
          {!permissionsReady && (
            <button className={s.btn} onClick={onConfigurarPermissoes}>
              Configurar
            </button>
          )}
          {permissionsReady && <span className={s.statusOk}>Tudo pronto</span>}
        </div>

        <div className={s.row}>
          <div>
            <div className={s.label}>Testar notificações</div>
            <div className={s.desc}>Envia um aviso comum para confirmar que o aparelho está recebendo notificações.</div>
          </div>
          <button className={s.btn} onClick={onTestarNotif}>Testar</button>
        </div>
      </div>

      <div className={s.infoCard}>
        <div className={s.infoMark}>i</div>
        <div>
          <div className={s.label}>Funcionamento offline</div>
          <div className={s.desc}>
            {nativeNotifications
              ? 'No APK, medicamentos, estoque, histórico e horários ficam no aparelho. Os alarmes são agendados pelo Android e continuam funcionando sem internet ou em modo avião.'
              : 'Na versão web/PWA, alguns recursos dependem do navegador. Para funcionamento offline completo e alarmes, utilize o APK Android.'}
          </div>
        </div>
      </div>

      <div className={s.metaRow}>
        <span>RWS Remédios</span>
        <span>{nativeNotifications ? 'Android' : 'PWA'} · offline-first</span>
      </div>

      <button className={s.btnLogout} onClick={() => window.location.reload()}>
        Sair
      </button>
    </div>
  )
}
