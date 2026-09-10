import s from './TabConfig.module.css'

export default function TabConfig({
  notifAtiva,
  exactAlarmStatus,
  nativeNotifications,
  onAtivarNotif,
  onConfigurarAlarmes,
  onTestarNotif,
}) {
  const exactGranted = exactAlarmStatus === 'granted' || exactAlarmStatus === 'not-applicable'

  const notificationStatus = notifAtiva
    ? 'Ativadas e funcionando'
    : 'Ainda não ativadas'

  const exactStatus = exactGranted
    ? 'Horários precisos habilitados'
    : 'O Android precisa de uma autorização adicional para horários precisos'

  return (
    <div className={s.wrap}>
      <section className={s.intro}>
        <span className={s.eyebrow}>Ajustes</span>
        <h1>Lembretes e preferências</h1>
        <p>Configure o Android para que os avisos de dose sejam entregues com a maior precisão possível.</p>
      </section>

      <div className={s.card}>
        <div className={s.row}>
          <div>
            <div className={s.label}>Lembretes de dose</div>
            <div className={s.desc}>{notificationStatus}</div>
          </div>
          <button
            className={`${s.btn} ${notifAtiva ? s.btnActive : ''}`}
            onClick={onAtivarNotif}
            disabled={notifAtiva}
          >
            {notifAtiva ? 'Ativados' : 'Ativar'}
          </button>
        </div>

        {nativeNotifications && (
          <div className={s.row}>
            <div>
              <div className={s.label}>Precisão dos alarmes</div>
              <div className={s.desc}>{exactStatus}</div>
            </div>
            {!exactGranted && (
              <button className={s.btn} onClick={onConfigurarAlarmes}>
                Configurar
              </button>
            )}
            {exactGranted && <span className={s.statusOk}>Ativo</span>}
          </div>
        )}

        <div className={s.row}>
          <div>
            <div className={s.label}>Testar notificação</div>
            <div className={s.desc}>Envie um aviso agora para confirmar que o aparelho está recebendo corretamente.</div>
          </div>
          <button className={s.btn} onClick={onTestarNotif}>Testar</button>
        </div>
      </div>

      <div className={s.infoCard}>
        <div className={s.infoMark}>i</div>
        <div>
          <div className={s.label}>Como funciona</div>
          <div className={s.desc}>
            {nativeNotifications
              ? 'No APK, os horários ficam agendados diretamente no Android e não dependem de manter o RWS Remédios aberto.'
              : 'Na versão web/PWA, os lembretes dependem mais do navegador. Para maior confiabilidade, utilize o APK Android.'}
          </div>
        </div>
      </div>

      <div className={s.metaRow}>
        <span>RWS Remédios</span>
        <span>{nativeNotifications ? 'Android' : 'PWA'} · versão de teste</span>
      </div>

      <button className={s.btnLogout} onClick={() => window.location.reload()}>
        Sair
      </button>
    </div>
  )
}
