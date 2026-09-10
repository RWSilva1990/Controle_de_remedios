package br.com.rwsilva.remedios;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONObject;

public class RwsAlarmActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        JSONArray items = RwsAlarmReceiver.getItems(intent);

        if (RwsAlarmReceiver.ACTION_TAKEN.equals(action)) {
            recordAll(context, items, "taken");
            cancelNotification(context, intent.getIntExtra("alarmId", 0));
            return;
        }

        if (RwsAlarmReceiver.ACTION_SNOOZE.equals(action)) {
            recordAll(context, items, "snoozed");
            RwsAlarmScheduler.snooze(context, intent, 10);
            cancelNotification(context, intent.getIntExtra("alarmId", 0));
        }
    }

    private void recordAll(Context context, JSONArray items, String action) {
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            RwsAlarmActions.add(
                context,
                action,
                item.optString("medicationId", ""),
                item.optString("medicationName", "Medicamento"),
                item.optInt("quantity", 1)
            );
        }
    }

    private void cancelNotification(Context context, int id) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(id);
    }
}
