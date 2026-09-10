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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class RwsAlarmActivity extends Activity {
    private Ringtone ringtone;
    private Vibrator vibrator;
    private JSONArray remainingItems = new JSONArray();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(235, 246, 255));
        window.setNavigationBarColor(Color.rgb(239, 247, 255));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }

        remainingItems = RwsAlarmReceiver.getItems(getIntent());
        setContentView(buildContent());
        startAlarmFeedback();
    }

    private View buildContent() {
        String currentTime = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setOverScrollMode(View.OVER_SCROLL_NEVER);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(24), dp(34), dp(24), dp(34));
        GradientDrawable bg = new GradientDrawable(
            GradientDrawable.Orientation.TL_BR,
            new int[] {
                Color.rgb(236, 247, 255),
                Color.rgb(244, 250, 255),
                Color.rgb(229, 243, 255)
            }
        );
        root.setBackground(bg);
        scroll.addView(root, new ScrollView.LayoutParams(
            ScrollView.LayoutParams.MATCH_PARENT,
            ScrollView.LayoutParams.MATCH_PARENT
        ));

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(content, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout brandRow = new LinearLayout(this);
        brandRow.setOrientation(LinearLayout.HORIZONTAL);
        brandRow.setGravity(Gravity.CENTER_VERTICAL);

        ImageView mark = new ImageView(this);
        mark.setImageResource(R.drawable.rws_app_icon);
        mark.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        brandRow.addView(mark, new LinearLayout.LayoutParams(dp(54), dp(54)));

        TextView brand = new TextView(this);
        brand.setText("RWS Remédios");
        brand.setTextSize(20);
        brand.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        brand.setTextColor(Color.rgb(20, 31, 55));
        LinearLayout.LayoutParams brandParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        brandParams.leftMargin = dp(12);
        brandRow.addView(brand, brandParams);
        content.addView(brandRow);

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
        timeParams.topMargin = dp(24);
        content.addView(time, timeParams);

        TextView eyebrow = new TextView(this);
        eyebrow.setText(remainingItems.length() > 1 ? "HORA DOS MEDICAMENTOS" : "HORA DO MEDICAMENTO");
        eyebrow.setTextSize(12);
        eyebrow.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        eyebrow.setLetterSpacing(0.08f);
        eyebrow.setTextColor(Color.rgb(95, 111, 132));
        eyebrow.setGravity(Gravity.CENTER);
        content.addView(eyebrow);

        LinearLayout itemsContainer = new LinearLayout(this);
        itemsContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams itemsParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        itemsParams.topMargin = dp(18);
        content.addView(itemsContainer, itemsParams);

        for (int i = 0; i < remainingItems.length(); i++) {
            final JSONObject item = remainingItems.optJSONObject(i);
            if (item == null) continue;
            final LinearLayout card = buildMedicationCard(item, itemsContainer);
            itemsContainer.addView(card);
        }

        if (remainingItems.length() > 1) {
            TextView groupLabel = new TextView(this);
            groupLabel.setText("Ações para todos os medicamentos pendentes");
            groupLabel.setTextSize(12);
            groupLabel.setTextColor(Color.rgb(95, 111, 132));
            groupLabel.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams groupLabelParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            );
            groupLabelParams.topMargin = dp(22);
            content.addView(groupLabel, groupLabelParams);

            Button takenAll = makeButton("Tomei todos", true);
            takenAll.setOnClickListener(v -> handleAllTaken());
            LinearLayout.LayoutParams takenAllParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(54)
            );
            takenAllParams.topMargin = dp(10);
            content.addView(takenAll, takenAllParams);

            Button snoozeAll = makeButton("Adiar todos 10 min", false);
            snoozeAll.setOnClickListener(v -> handleAllSnooze());
            LinearLayout.LayoutParams snoozeAllParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(54)
            );
            snoozeAllParams.topMargin = dp(10);
            content.addView(snoozeAll, snoozeAllParams);
        }

        TextView hint = new TextView(this);
        hint.setText("O alarme continuará tocando enquanto houver medicamento pendente.");
        hint.setTextSize(12);
        hint.setTextColor(Color.rgb(112, 132, 143));
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        hintParams.topMargin = dp(16);
        content.addView(hint, hintParams);

        return scroll;
    }

    private LinearLayout buildMedicationCard(JSONObject item, LinearLayout itemsContainer) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(18), dp(18), dp(18), dp(16));
        card.setBackground(roundedWithStroke(Color.argb(246, 255, 255, 255), Color.rgb(211, 229, 246), 22, 1));
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.bottomMargin = dp(10);
        card.setLayoutParams(cardParams);

        TextView med = new TextView(this);
        med.setText(item.optString("medicationName", "Medicamento"));
        med.setTextSize(21);
        med.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        med.setTextColor(Color.rgb(20, 31, 55));
        med.setGravity(Gravity.CENTER);
        card.addView(med);

        int quantity = item.optInt("quantity", 1);
        TextView dose = new TextView(this);
        dose.setText("Tome " + quantity + (quantity == 1 ? " comprimido" : " comprimidos"));
        dose.setTextSize(15);
        dose.setTextColor(Color.rgb(92, 103, 126));
        dose.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams doseParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        doseParams.topMargin = dp(5);
        card.addView(dose, doseParams);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams actionsParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(48)
        );
        actionsParams.topMargin = dp(14);
        card.addView(actions, actionsParams);

        Button taken = makeButton("Tomei", true);
        LinearLayout.LayoutParams halfOne = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        halfOne.rightMargin = dp(5);
        actions.addView(taken, halfOne);

        Button snooze = makeButton("Adiar 10 min", false);
        LinearLayout.LayoutParams halfTwo = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f);
        halfTwo.leftMargin = dp(5);
        actions.addView(snooze, halfTwo);

        taken.setOnClickListener(v -> handleSingle(item, card, itemsContainer, false));
        snooze.setOnClickListener(v -> handleSingle(item, card, itemsContainer, true));
        return card;
    }

    private Button makeButton(String text, boolean primary) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(primary ? 15 : 14);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setTextColor(primary ? Color.WHITE : Color.rgb(46, 79, 112));
        button.setAllCaps(false);
        button.setBackground(primary
            ? rounded(Color.rgb(22, 119, 238), 15)
            : roundedWithStroke(Color.argb(242, 255, 255, 255), Color.rgb(196, 219, 241), 15, 1));
        button.setStateListAnimator(null);
        return button;
    }

    private void handleSingle(JSONObject item, View card, LinearLayout container, boolean snooze) {
        String action = snooze ? "snoozed" : "taken";
        RwsAlarmActions.add(
            this,
            action,
            item.optString("medicationId", ""),
            item.optString("medicationName", "Medicamento"),
            item.optInt("quantity", 1)
        );
        if (snooze) RwsAlarmScheduler.snoozeItem(this, getIntent(), item, 10);
        removeRemaining(item);
        container.removeView(card);
        if (remainingItems.length() == 0) dismissAlarm();
    }

    private void handleAllTaken() {
        recordRemaining("taken");
        dismissAlarm();
    }

    private void handleAllSnooze() {
        recordRemaining("snoozed");
        Intent copy = new Intent(getIntent());
        copy.putExtra("itemsJson", remainingItems.toString());
        RwsAlarmScheduler.snooze(this, copy, 10);
        dismissAlarm();
    }

    private void recordRemaining(String action) {
        for (int i = 0; i < remainingItems.length(); i++) {
            JSONObject item = remainingItems.optJSONObject(i);
            if (item == null) continue;
            RwsAlarmActions.add(
                this,
                action,
                item.optString("medicationId", ""),
                item.optString("medicationName", "Medicamento"),
                item.optInt("quantity", 1)
            );
        }
    }

    private void removeRemaining(JSONObject target) {
        String targetId = target.optString("medicationId", "");
        int targetDose = target.optInt("doseIndex", -1);
        for (int i = remainingItems.length() - 1; i >= 0; i--) {
            JSONObject item = remainingItems.optJSONObject(i);
            if (item == null) continue;
            if (targetId.equals(item.optString("medicationId", "")) && targetDose == item.optInt("doseIndex", -1)) {
                remainingItems.remove(i);
                return;
            }
        }
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            else vibrator.vibrate(pattern, 0);
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
