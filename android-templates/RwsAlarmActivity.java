package br.com.rwsilva.remedios;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

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

        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(246, 248, 251));
        window.setNavigationBarColor(Color.rgb(246, 248, 251));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        setContentView(buildContent());
        startAlarmFeedback();
    }

    private View buildContent() {
        Intent intent = getIntent();
        String medicationName = intent.getStringExtra("medicationName");
        int quantity = intent.getIntExtra("quantity", 1);
        String currentTime = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setPadding(dp(24), dp(28), dp(24), dp(28));
        root.setBackgroundColor(Color.rgb(246, 248, 251));

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setOrientation(LinearLayout.HORIZONTAL);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView mark = new TextView(this);
        mark.setText("R");
        mark.setTextSize(16);
        mark.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        mark.setGravity(Gravity.CENTER);
        mark.setTextColor(Color.WHITE);
        mark.setBackground(rounded(Color.rgb(22, 119, 238), 14));
        brandRow.addView(mark, new LinearLayout.LayoutParams(dp(38), dp(38)));

        TextView brand = new TextView(this);
        brand.setText("RWS Remédios");
        brand.setTextSize(16);
        brand.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brand.setTextColor(Color.rgb(20, 31, 55));
        LinearLayout.LayoutParams brandParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        brandParams.leftMargin = dp(10);
        brandRow.addView(brand, brandParams);
        root.addView(brandRow);

        TextView time = new TextView(this);
        time.setText(currentTime);
        time.setTextSize(54);
        time.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        time.setLetterSpacing(-0.03f);
        time.setTextColor(Color.rgb(20, 31, 55));
        time.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams timeParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        timeParams.topMargin = dp(42);
        root.addView(time, timeParams);

        TextView eyebrow = new TextView(this);
        eyebrow.setText("HORA DO MEDICAMENTO");
        eyebrow.setTextSize(12);
        eyebrow.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        eyebrow.setLetterSpacing(0.08f);
        eyebrow.setTextColor(Color.rgb(95, 111, 132));
        eyebrow.setGravity(Gravity.CENTER);
        root.addView(eyebrow);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(22), dp(24), dp(22), dp(24));
        card.setBackground(roundedWithStroke(Color.WHITE, Color.rgb(226, 233, 241), 24, 1));
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.topMargin = dp(24);
        root.addView(card, cardParams);

        TextView med = new TextView(this);
        med.setText(medicationName == null ? "Medicamento" : medicationName);
        med.setTextSize(24);
        med.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        med.setTextColor(Color.rgb(20, 31, 55));
        med.setGravity(Gravity.CENTER);
        card.addView(med);

        TextView dose = new TextView(this);
        dose.setText("Tome " + quantity + (quantity == 1 ? " comprimido" : " comprimidos"));
        dose.setTextSize(16);
        dose.setTextColor(Color.rgb(92, 103, 126));
        dose.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams doseParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        doseParams.topMargin = dp(8);
        card.addView(dose, doseParams);

        Button taken = new Button(this);
        taken.setText("Tomei");
        taken.setTextSize(17);
        taken.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        taken.setTextColor(Color.WHITE);
        taken.setAllCaps(false);
        taken.setBackground(rounded(Color.rgb(22, 119, 238), 16));
        taken.setStateListAnimator(null);
        taken.setOnClickListener(v -> handleTaken());
        LinearLayout.LayoutParams takenParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(56)
        );
        takenParams.topMargin = dp(34);
        root.addView(taken, takenParams);

        Button snooze = new Button(this);
        snooze.setText("Adiar 10 min");
        snooze.setTextSize(16);
        snooze.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        snooze.setTextColor(Color.rgb(63, 88, 115));
        snooze.setAllCaps(false);
        snooze.setBackground(roundedWithStroke(Color.WHITE, Color.rgb(220, 231, 242), 16, 1));
        snooze.setStateListAnimator(null);
        snooze.setOnClickListener(v -> handleSnooze());
        LinearLayout.LayoutParams snoozeParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(56)
        );
        snoozeParams.topMargin = dp(12);
        root.addView(snooze, snoozeParams);

        TextView hint = new TextView(this);
        hint.setText("O alarme continuará tocando até você escolher uma opção.");
        hint.setTextSize(12);
        hint.setTextColor(Color.rgb(126, 139, 156));
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        hintParams.topMargin = dp(18);
        root.addView(hint, hintParams);

        return root;
    }

    private GradientDrawable rounded(int color, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        return drawable;
    }

    private GradientDrawable roundedWithStroke(int color, int strokeColor, int radiusDp, int strokeDp) {
        GradientDrawable drawable = rounded(color, radiusDp);
        drawable.setStroke(dp(strokeDp), strokeColor);
        return drawable;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
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
