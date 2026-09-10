import s from './TabConfig.module.css'

export default function TabConfig({
  notifAtiva,
  exactAlarmStatus,
  fullScreenStatus,
  nativeNotifications,
  onAtivarNotif,
  onConfigurarAlarmes,
  onConfigurarTelaCheia,
  onTestarNotif,
}) {
  const exactGranted = exactAlarmStatus === 'granted' || exactAlarmStatus === 'not-applicable'
  const fullScreenGranted = fullScreenStatus === 'granted' || fullScreenStatus === 'not-applicable'

  const notificationStatus = notifAtiva
    ? 'Ativadas e funcionando'
    : 'Ainda não ativadas'

  const exactStatus = exactGranted
    ? 'Horários precisos habilitados'
    : 'O Android precisa de uma autorização adicional para horários precisos'

  const fullScreenText = fullScreenGranted
    ? 'O alarme pode aparecer sobre a tela bloqueada'
    : 'Autorize alarmes em tela cheia para sobrepor a tela bloqueada'

  return (
    <div className={s.wrap}>
      <section className={s.intro}>
        <span className={s.eyebrow}>Ajustes</span>
        <h1>Lembretes e preferências</h1>
        <p>Configure o Android para que os horários dos medicamentos funcionem como alarmes.</p>
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
          <>
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

            <div className={s.row}>
              <div>
                <div className={s.label}>Tela cheia na tela bloqueada</div>
                <div className={s.desc}>{fullScreenText}</div>
              </div>
              {!fullScreenGranted && (
                <button className={s.btn} onClick={onConfigurarTelaCheia}>
                  Autorizar
                </button>
              )}
              {fullScreenGranted && <span className={s.statusOk}>Ativo</span>}
            </div>
          </>
        )}

        <div className={s.row}>
          <div>
            <div className={s.label}>Testar notificação</div>
            <div className={s.desc}>Envia uma notificação comum. O teste do alarme deve ser feito cadastrando um horário próximo.</div>
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
              ? 'No APK, cada horário de dose é agendado como um alarme Android. No horário, ele pode acender a tela, aparecer sobre a tela bloqueada e oferecer Tomei ou Adiar 10 min.'
              : 'Na versão web/PWA, os lembretes dependem mais do navegador. Para comportamento de alarme, utilize o APK Android.'}
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
