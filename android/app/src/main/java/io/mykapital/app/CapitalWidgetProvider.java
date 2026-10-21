package io.mykapital.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

/**
 * Home-screen widget for My Capital.
 *
 * Reads display-only strings from the {@code my_capital_widget} prefs file
 * (written by the JS layer via {@code SystemUiBridge.widgetSetValue}). The
 * widget never reads the encrypted app state directly — all monetary
 * formatting happens in JS and is mirrored as plain strings ready for
 * rendering.
 *
 * Three tap targets all open {@code MainActivity} with a custom URI so the
 * JS deep-link handler can route to the right modal:
 *   - tap the body         → my-capital://widget?action=open
 *   - tap the "+" income   → my-capital://widget?action=income
 *   - tap the "-" expense  → my-capital://widget?action=expense
 */
public class CapitalWidgetProvider extends AppWidgetProvider {
    public static final String WIDGET_PREFS_NAME = "my_capital_widget";
    public static final String DEEP_LINK_SCHEME = "my-capital";
    public static final String DEEP_LINK_HOST = "widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            renderWidget(context, manager, id);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int appWidgetId, Bundle newOptions) {
        renderWidget(context, manager, appWidgetId);
    }

    private void renderWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(WIDGET_PREFS_NAME, Context.MODE_PRIVATE);

        String appTitle = prefs.getString("app_title", "My Capital");
        String availableLabel = prefs.getString("available_label", "Available");
        String availableValue = prefs.getString("available_value", "—");
        String capitalLabel = prefs.getString("capital_label", "Capital");
        String capitalValue = prefs.getString("capital_value", "—");
        String progressText = prefs.getString("progress_text", "0%");
        String incomeLabel = prefs.getString("income_label", "+ Income");
        String expenseLabel = prefs.getString("expense_label", "- Expense");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.capital_widget_medium);
        views.setTextViewText(R.id.widget_app_title, appTitle);
        views.setTextViewText(R.id.widget_available_label, availableLabel);
        views.setTextViewText(R.id.widget_available_value, availableValue);
        views.setTextViewText(R.id.widget_capital_label, capitalLabel);
        views.setTextViewText(R.id.widget_capital_value, capitalValue + " · " + progressText);
        views.setTextViewText(R.id.widget_income_button, "+ " + incomeLabel);
        views.setTextViewText(R.id.widget_expense_button, "− " + expenseLabel);

        views.setOnClickPendingIntent(R.id.widget_root, buildLaunchIntent(context, "open", appWidgetId));
        views.setOnClickPendingIntent(R.id.widget_income_button, buildLaunchIntent(context, "income", appWidgetId));
        views.setOnClickPendingIntent(R.id.widget_expense_button, buildLaunchIntent(context, "expense", appWidgetId));

        manager.updateAppWidget(appWidgetId, views);
    }

    private PendingIntent buildLaunchIntent(Context context, String action, int appWidgetId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.setData(
            new Uri.Builder()
                .scheme(DEEP_LINK_SCHEME)
                .authority(DEEP_LINK_HOST)
                .appendQueryParameter("action", action)
                .build()
        );
        // requestCode must be unique per (widgetId, action) so the
        // PendingIntents do not collide and reuse old extras.
        int requestCode = (appWidgetId * 10) + action.hashCode();
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    /**
     * Static helper invoked by SystemUiBridge.widgetUpdate() — broadcasts an
     * update intent so every installed instance redraws on the next tick.
     */
    public static void requestRedraw(Context context) {
        Intent intent = new Intent(context, CapitalWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, CapitalWidgetProvider.class));
        if (ids != null && ids.length > 0) {
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
    }
}
