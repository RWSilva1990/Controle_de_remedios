package br.com.rwsilva.remedios;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

public class RwsAlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "rws-dose-alarm";
    public static final String ACTION_TAKEN = "br.com.rwsilva.remedios.TAKEN";
    public static final String ACTION_SNOOZE = "br.com.rwsilva.remedios.SNOOZE";

    @Override
    public void onReceive(Context context, Intent intent) {
        RwsAlarmScheduler.scheduleNextDaily(context, intent);
        ensureChannel(context);

        int alarmId = intent.getIntExtra("alarmId", 0);
        JSONArray items = getItems(intent);
        int count = items.length();

        Intent fullScreen = copyAlarmIntent(new Intent(context, RwsAlarmActivity.class), intent);
        fullScreen.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent fullScreenPending = PendingIntent.getActivity(
            context,
            alarmId,
            fullScreen,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent takenIntent = copyAlarmIntent(new Intent(context, RwsAlarmActionReceiver.class), intent);
        takenIntent.setAction(ACTION_TAKEN);
        PendingIntent takenPending = PendingIntent.getBroadcast(
            context,
            alarmId + 1000000,
            takenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent snoozeIntent = copyAlarmIntent(new Intent(context, RwsAlarmActionReceiver.class), intent);
        snoozeIntent.setAction(ACTION_SNOOZE);
        PendingIntent snoozePending = PendingIntent.getBroadcast(
            context,
            alarmId + 2000000,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = count > 1 ? count + " medicamentos agora" : firstName(items);
        String text = count > 1 ? namesSummary(items) : singleDoseText(items);
        String takenLabel = count > 1 ? "Tomei todos" : "Tomei";
        String snoozeLabel = count > 1 ? "Adiar todos 10 min" : "Adiar 10 min";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPending, true)
            .setContentIntent(fullScreenPending)
            .addAction(android.R.drawable.checkbox_on_background, takenLabel, takenPending)
            .addAction(android.R.drawable.ic_media_pause, snoozeLabel, snoozePending);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(alarmId, builder.build());
    }

    public static JSONArray getItems(Intent intent) {
        try {
            return new JSONArray(intent.getStringExtra("itemsJson"));
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private String firstName(JSONArray items) {
        JSONObject item = items.optJSONObject(0);
        return item == null ? "Hora do medicamento" : item.optString("medicationName", "Medicamento");
    }

    private String singleDoseText(JSONArray items) {
        JSONObject item = items.optJSONObject(0);
        if (item == null) return "Hora do medicamento.";
        int quantity = item.optInt("quantity", 1);
        return "Tome " + quantity + (quantity == 1 ? " comprimido." : " comprimidos.");
    }

    private String namesSummary(JSONArray items) {
        StringBuilder builder = new StringBuilder("Hora de tomar: ");
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            if (i > 0) builder.append(i == items.length() - 1 ? " e " : ", ");
            builder.append(item.optString("medicationName", "Medicamento"));
        }
        return builder.toString();
    }

    private static Intent copyAlarmIntent(Intent target, Intent source) {
        target.putExtra("alarmId", source.getIntExtra("alarmId", 0));
        target.putExtra("hour", source.getIntExtra("hour", 8));
        target.putExtra("minute", source.getIntExtra("minute", 0));
        target.putExtra("itemsJson", source.getStringExtra("itemsJson"));
        target.putExtra("snooze", source.getBooleanExtra("snooze", false));
        return target;
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) return;

        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Alarmes de medicamentos",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alarmes em tela cheia para os horários dos medicamentos.");
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] {0, 800, 400, 800, 400, 800});
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.setSound(alarmSound, attrs);
        manager.createNotificationChannel(channel);
    }
}
