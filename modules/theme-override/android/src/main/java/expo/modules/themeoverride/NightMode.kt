package expo.modules.themeoverride

import android.content.Context
import androidx.appcompat.app.AppCompatDelegate

/**
 * The stored theme preference, applied before any activity exists so a cold
 * start never has to relaunch to pick it up. JavaScript keeps the same value
 * in its own store; this copy is only so the process can read it first.
 */
object NightMode {
  private const val PREFS = "theme-override"
  private const val KEY = "mode"

  fun read(context: Context): String =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "system") ?: "system"

  fun write(context: Context, mode: String) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, mode).apply()
  }

  fun apply(mode: String) {
    AppCompatDelegate.setDefaultNightMode(
      when (mode) {
        "light" -> AppCompatDelegate.MODE_NIGHT_NO
        "dark" -> AppCompatDelegate.MODE_NIGHT_YES
        else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
      }
    )
  }
}
