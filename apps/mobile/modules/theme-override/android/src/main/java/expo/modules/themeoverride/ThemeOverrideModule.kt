package expo.modules.themeoverride

import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ThemeOverrideModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ThemeOverride")

    Function("getSystemNightMode") { NightMode.systemNightMode() }

    Function("setNightMode") { mode: String ->
      val context = appContext.reactContext ?: return@Function
      NightMode.write(context, mode)
      Handler(Looper.getMainLooper()).post { NightMode.apply(mode) }
    }
  }
}
