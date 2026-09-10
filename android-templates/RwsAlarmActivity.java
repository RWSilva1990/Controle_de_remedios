package br.com.rwsilva.remedios;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class RwsAlarmActivity extends Activity {
    private Ringtone ringtone;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );

        setContentView(buildContent());
        startAlarmFeedback();
    }

    private View buildContent() {
        Intent intent = getIntent();
        String medicationName = intent.getStringExtra("medicationName");
        int quantity = intent.getIntExtra("quantity", 1);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(48, 64, 48, 64);
        root.setBackgroundColor(Color.rgb(246, 248, 251));

        TextView eyebrow = new TextView(this);
        eyebrow.setText("RWS REMÉDIOS");
        eyebrow.setTextSize(14);
        eyebrow.setTextColor(Color.rgb(77, 111, 255));
        eyebrow.setGravity(Gravity.CENTER);
        root.addView(eyebrow);

        TextView title = new TextView(this);
        title.setText("Hora do medicamento");
        title.setTextSize(28);
        title.setTextColor(Color.rgb(20, 31, 55));
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 30, 0, 12);
        root.addView(title);

        TextView med = new TextView(this);
        med.setText(medicationName == null ? "Medicamento" : medicationName);
        med.setTextSize(24);
        med.setTextColor(Color.rgb(20, 31, 55));
        med.setGravity(Gravity.CENTER);
        root.addView(med);

        TextView dose = new TextView(this);
        dose.setText("Tome " + quantity + (quantity == 1 ? " comprimido" : " comprimidos"));
        dose.setTextSize(18);
        dose.setTextColor(Color.rgb(92, 103, 126));
        dose.setGravity(Gravity.CENTER);
        dose.setPadding(0, 8, 0, 44);
        root.addView(dose);

        Button taken = new Button(this);
        taken.setText("Tomei");
        taken.setTextSize(18);
        taken.setAllCaps(false);
        taken.setOnClickListener(v -> handleTaken());
        root.addView(taken, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        Button snooze = new Button(this);
        snooze.setText("Adiar 10 min");
        snooze.setTextSize(17);
        snooze.setAllCaps(false);
        LinearLayout.LayoutParams snoozeParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        snoozeParams.topMargin = 18;
        snooze.setOnClickListener(v -> handleSnooze());
        root.addView(snooze, snoozeParams);

        return root;
    }

    private void handleTaken() {
        Intent intent = getIntent();
        RwsAlarmActions.add(
            this,
            "taken",
            intent.getStringExtra("medicationId"),
            intent.getStringExtra("medicationName"),
            intent.getIntExtra("quantity", 1)
        );
        dismissAlarm();
    }

    private void handleSnooze() {
        Intent intent = getIntent();
        RwsAlarmActions.add(
            this,
            "snoozed",
            intent.getStringExtra("medicationId"),
            intent.getStringExtra("medicationName"),
            intent.getIntExtra("quantity", 1)
        );
        RwsAlarmScheduler.snooze(this, intent, 10);
        dismissAlarm();
    }

    private void startAlarmFeedback() {
        try {
            ringtone = RingtoneManager.getRingtone(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));
            if (ringtone != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ringtone.setLooping(true);
                ringtone.play();
            }
        } catch (Exception ignored) {}

        try {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            long[] pattern = new long[] {0, 800, 400, 800, 400, 800};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        } catch (Exception ignored) {}
    }

    private void stopAlarmFeedback() {
        try { if (ringtone != null && ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) {}
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) {}
    }

    private void dismissAlarm() {
        stopAlarmFeedback();
        int alarmId = getIntent().getIntExtra("alarmId", 0);
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(alarmId);
        finishAndRemoveTask();
    }

    @Override
    protected void onDestroy() {
        stopAlarmFeedback();
        super.onDestroy();
    }
}
