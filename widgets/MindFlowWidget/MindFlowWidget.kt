package com.mindflow.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.widget.RemoteViews

class MindFlowWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        private const val PREFS_NAME = "com.mindflow.widget.prefs"
        private const val KEY_STREAK = "streak"
        private const val KEY_ENTRIES = "totalEntries"
        private const val KEY_WORDS = "totalWords"
        private const val KEY_TODAY = "todayWritten"
        private const val KEY_LAST_DATE = "lastEntryDate"

        fun updateWidgetData(
            context: Context,
            streak: Int,
            totalEntries: Int,
            totalWords: Int,
            todayWritten: Boolean,
            lastEntryDate: String?
        ) {
            val prefs: SharedPreferences =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putInt(KEY_STREAK, streak)
                .putInt(KEY_ENTRIES, totalEntries)
                .putInt(KEY_WORDS, totalWords)
                .putBoolean(KEY_TODAY, todayWritten)
                .putString(KEY_LAST_DATE, lastEntryDate)
                .apply()

            val manager = AppWidgetManager.getInstance(context)
            val widgetIds = manager.getAppWidgetIds(
                ComponentName(context, MindFlowWidgetProvider::class.java)
            )
            manager.notifyAppWidgetViewDataChanged(widgetIds, android.R.id.content)
            for (id in widgetIds) {
                updateAppWidget(context, manager, id)
            }
        }

        private fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs: SharedPreferences =
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val streak = prefs.getInt(KEY_STREAK, 0)
            val entries = prefs.getInt(KEY_ENTRIES, 0)
            val words = prefs.getInt(KEY_WORDS, 0)
            val todayWritten = prefs.getBoolean(KEY_TODAY, false)
            val lastDate = prefs.getString(KEY_LAST_DATE, null)

            val views = RemoteViews(context.packageName, R.layout.mindflow_widget)

            views.setTextViewText(R.id.widget_streak, streak.toString())
            views.setTextViewText(R.id.widget_entries, entries.toString())
            views.setTextViewText(R.id.widget_words, words.toString())
            views.setTextViewText(
                R.id.widget_today,
                if (todayWritten) "Written today" else "Not yet written"
            )
            if (lastDate != null) {
                views.setTextViewText(R.id.widget_last_entry, "Last: $lastDate")
            }

            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
