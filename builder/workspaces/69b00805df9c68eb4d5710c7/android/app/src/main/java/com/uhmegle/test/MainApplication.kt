package com.uhmegle.test

import android.app.Application
import android.content.pm.PackageManager
import com.onesignal.OneSignal

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    initOneSignal()
  }

  private fun initOneSignal() {
    val appId = getMetaData("onesignal_app_id")
    if (!appId.isNullOrEmpty()) {
      OneSignal.initWithContext(this)
      OneSignal.setAppId(appId)
    }
  }

  private fun getMetaData(key: String): String? {
    return try {
      val ai = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
      ai.metaData?.getString(key)
    } catch (e: Exception) {
      null
    }
  }
}
