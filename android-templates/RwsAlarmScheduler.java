package br.com.rwsilva.remedios;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

public final class RwsAlarmScheduler {
    private static final String PREFS = "rws_alarm_scheduler";
    private static final String IDS = "known_ids";

    private RwsAlarmScheduler() {}

    public static void scheduleDailyAlarm(Context context, int id, int hour, int minute,
                                          String medicationId, String medicationName,
                                          int quantity, int doseIndex) {
        Calendar when = Calendar.getInstance();
        when.set(Calendar.HOUR_OF_DAY, hour);
        when.set(Calendar.MINUTE, minute);
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);
        if (when.getTimeInMillis() <= System.currentTimeMillis()) {
            when.add(Calendar.DAY_OF_YEAR, 1);
        }

        scheduleAt(context, id, when.getTimeInMillis(), hour, minute, medicationId,
            medicationName, quantity, doseIndex, false);
        rememberId(context, id);
    }

    public static void scheduleNextDaily(Context context, Intent source) {
        if (source.getBooleanExtra("snooze", false)) return;

        Calendar when = Calendar.getInstance();
        when.add(Calendar.DAY_OF_YEAR, 1);
        when.set(Calendar.HOUR_OF_DAY, source.getIntExtra("hour", 8));
        when.set(Calendar.MINUTE, source.getIntExtra("minute", 0));
        when.set(Calendar.SECOND, 0);
        when.set(Calendar.MILLISECOND, 0);

        scheduleAt(
            context,
            source.getIntExtra("alarmId", 0),
            when.getTimeInMillis(),
            source.getIntExtra("hour", 8),
            source.getIntExtra("minute", 0),
            source.getStringExtra("medicationId"),
            source.getStringExtra("medicationName"),
            source.getIntExtra("quantity", 1),
            source.getIntExtra("doseIndex", 0),
            false
        );
    }

    public static void snooze(Context context, Intent source, int minutes) {
        int originalId = source.getIntExtra("alarmId", 0);
        int snoozeId = originalId + 4000000;
        long triggerAt = System.currentTimeMillis() + (minutes * 60L * 1000L);
        scheduleAt(
            context,
            snoozeId,
            triggerAt,
            source.getIntExtra("hour", 8),
            source.getIntExtra("minute", 0),
            source.getStringExtra("medicationId"),
            source.getStringExtra("medicationName"),
            source.getIntExtra("quantity", 1),
            source.getIntExtra("doseIndex", 0),
            true
        );
    }

    private static void scheduleAt(Context context, int id, long triggerAt, int hour, int minute,
                                   String medicationId, String medicationName,
                                   int quantity, int doseIndex, boolean snooze) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, RwsAlarmReceiver.class);
        intent.putExtra("alarmId", id);
        intent.putExtra("hour", hour);
        intent.putExtra("minute", minute);
        intent.putExtra("medicationId", medicationId);
        intent.putExtra("medicationName", medicationName);
        intent.putExtra("quantity", quantity);
        intent.putExtra("doseIndex", doseIndex);
        intent.putExtra("snooze", snooze);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(context, RwsAlarmActivity.class);
        PendingIntent showPendingIntent = PendingIntent.getActivity(
            context,
            id + 100000,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager.AlarmClockInfo info = new AlarmManager.AlarmClockInfo(triggerAt, showPendingIntent);
        alarmManager.setAlarmClock(info, pendingIntent);
    }

    public static void cancelKnownAlarms(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> ids = prefs.getStringSet(IDS, new HashSet<>());
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (String raw : ids) {
            try {
                int id = Integer.parseInt(raw);
                Intent intent = new Intent(context, RwsAlarmReceiver.class);
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    id,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                );
                if (pendingIntent != null) alarmManager.cancel(pendingIntent);
            } catch (Exception ignored) {}
        }
        prefs.edit().remove(IDS).apply();
    }

    private static void rememberId(Context context, int id) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> ids = new HashSet<>(prefs.getStringSet(IDS, new HashSet<>()));
        ids.add(String.valueOf(id));
        prefs.edit().putStringSet(IDS, ids).apply();
    }
}
