package br.com.rwsilva.remedios;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class RwsAlarmActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (RwsAlarmReceiver.ACTION_TAKEN.equals(action)) {
            RwsAlarmActions.add(
                context,
                "taken",
                intent.getStringExtra("medicationId"),
                intent.getStringExtra("medicationName"),
                intent.getIntExtra("quantity", 1)
            );
            cancelNotification(context, intent.getIntExtra("alarmId", 0));
            return;
        }

        if (RwsAlarmReceiver.ACTION_SNOOZE.equals(action)) {
            RwsAlarmActions.add(
                context,
                "snoozed",
                intent.getStringExtra("medicationId"),
                intent.getStringExtra("medicationName"),
                intent.getIntExtra("quantity", 1)
            );
            RwsAlarmScheduler.snooze(context, intent, 10);
            cancelNotification(context, intent.getIntExtra("alarmId", 0));
        }
    }

    private void cancelNotification(Context context, int id) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(id);
    }
}
