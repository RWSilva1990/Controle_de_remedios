package br.com.rwsilva.remedios;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "RwsAlarm")
public class RwsAlarmPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray alarms = call.getArray("alarms");
        if (alarms == null) {
            call.reject("Lista de alarmes não informada");
            return;
        }

        Context context = getContext();
        RwsAlarmScheduler.cancelKnownAlarms(context);

        int count = 0;
        try {
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject item = alarms.getJSONObject(i);
                int id = item.getInt("id");
                int hour = item.getInt("hour");
                int minute = item.getInt("minute");
                JSONArray doseItems = item.optJSONArray("items");
                if (doseItems == null || doseItems.length() == 0) continue;

                RwsAlarmScheduler.scheduleDailyAlarm(
                    context,
                    id,
                    hour,
                    minute,
                    doseItems.toString()
                );
                count++;
            }
        } catch (Exception error) {
            call.reject("Falha ao agendar alarmes: " + error.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("scheduled", true);
        result.put("count", count);
        call.resolve(result);
    }

    @PluginMethod
    public void getFullScreenStatus(PluginCall call) {
        JSObject result = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            result.put("supported", true);
            result.put("granted", manager.canUseFullScreenIntent());
        } else {
            result.put("supported", true);
            result.put("granted", true);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Não foi possível abrir a configuração de tela cheia: " + error.getMessage());
        }
    }

    @PluginMethod
    public void consumeActions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("actions", RwsAlarmActions.consume(getContext()));
        call.resolve(result);
    }
}
