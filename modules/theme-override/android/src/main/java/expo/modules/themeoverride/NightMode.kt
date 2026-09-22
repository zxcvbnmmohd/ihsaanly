package expo.modules.themeoverride

import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
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

  /**
   * The device's own night setting, read from the system Resources rather than
   * the app's. AppCompatDelegate's override applies to this process only and
   * never touches the system configuration, so this stays correct at the exact
   * moment React Native's cached scheme does not: immediately after an override,
   * before the activity has been recreated.
   */
  fun systemNightMode(): String {
    val night = Resources.getSystem().configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return if (night == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
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
