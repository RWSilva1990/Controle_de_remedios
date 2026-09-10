package br.com.rwsilva.remedios;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONObject;

public final class RwsAlarmActions {
    private static final String PREFS = "rws_alarm_actions";
    private static final String KEY = "events";

    private RwsAlarmActions() {}

    public static void add(Context context, String action, String medicationId, String medicationName, int quantity) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray events = new JSONArray(prefs.getString(KEY, "[]"));
            JSONObject event = new JSONObject();
            event.put("action", action);
            event.put("medicationId", medicationId == null ? "" : medicationId);
            event.put("medicationName", medicationName == null ? "Medicamento" : medicationName);
            event.put("quantity", quantity);
            event.put("at", System.currentTimeMillis());
            events.put(event);
            prefs.edit().putString(KEY, events.toString()).apply();
        } catch (Exception ignored) {}
    }

    public static JSArray consume(Context context) {
        JSArray result = new JSArray();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray events = new JSONArray(prefs.getString(KEY, "[]"));
            for (int i = 0; i < events.length(); i++) {
                JSONObject item = events.getJSONObject(i);
                JSObject event = new JSObject();
                event.put("action", item.optString("action", ""));
                event.put("medicationId", item.optString("medicationId", ""));
                event.put("medicationName", item.optString("medicationName", "Medicamento"));
                event.put("quantity", item.optInt("quantity", 1));
                event.put("at", item.optLong("at", 0));
                result.put(event);
            }
            prefs.edit().remove(KEY).apply();
        } catch (Exception ignored) {}
        return result;
    }
}
