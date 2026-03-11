package chatonlive.com.aab.services

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AdminSettings(
    val googleSignInEnabled: Boolean = false,
    val googleSignInCountries: List<String> = emptyList(),
    val botsApiUrl: String = "https://umingle.com/data/bots.json",
    val privacyPolicyUrl: String = "",
    val termsOfServiceUrl: String = "",
    val communityGuidelinesUrl: String = "",
    val cookiePolicyUrl: String = "",
    val minimumAppVersion: String = "",
    val updateRequired: Boolean = false,
    val playStoreUrl: String = "https://play.google.com/store/apps/details?id=chatonlive.com.aab",
    val webviewUrl: String = "",
    val newApp: Boolean = false,
    val newAppUrl: String = "",
    val botOnlyMode: Boolean = false,
    val appSubtitle: String = "",
    val showLiveUsers: Boolean = true,
    val liveUsersCount: String = "",
    val liveUsersText: String = "",
    val loginButtonAreaBgColor: String = ""
)

class AdminService(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("admin_settings", Context.MODE_PRIVATE)
    private val client = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(3, TimeUnit.SECONDS)
        .build()
    
    private val REMOTE_ADMIN_SETTINGS_JSON_URL = "https://yap.chat/apps.json"
    private val PACKAGE_NAME = context.packageName
    private val CACHE_DURATION = 30 * 1000L // 30 seconds
    
    private val DEFAULT_SETTINGS = AdminSettings(
        googleSignInEnabled = false,
        googleSignInCountries = emptyList(),
        botsApiUrl = "https://umingle.com/data/bots.json",
        privacyPolicyUrl = "",
        termsOfServiceUrl = "",
        communityGuidelinesUrl = "",
        cookiePolicyUrl = "",
        minimumAppVersion = "",
        updateRequired = false,
        playStoreUrl = "https://play.google.com/store/apps/details?id=chatonlive.com.aab",
        webviewUrl = "",
        newApp = false,
        newAppUrl = "",
        botOnlyMode = false
    )
    
    suspend fun loadAdminSettings(forceRefresh: Boolean = true): AdminSettings = withContext(Dispatchers.IO) {
        try {
            // Check cache first if not forcing refresh
            if (!forceRefresh) {
                val cacheTime = prefs.getLong("cache_time", 0)
                val now = System.currentTimeMillis()
                if (now - cacheTime < CACHE_DURATION) {
                    val cachedJson = prefs.getString("cached_settings", null)
                    if (cachedJson != null) {
                        return@withContext parseSettings(JSONObject(cachedJson))
                    }
                }
            }
            
            // Fetch from remote
            val request = Request.Builder()
                .url(REMOTE_ADMIN_SETTINGS_JSON_URL)
                .addHeader("Cache-Control", "no-cache")
                .addHeader("Pragma", "no-cache")
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return@withContext DEFAULT_SETTINGS
                val appsData = JSONArray(responseBody)
                
                // Find settings for this package
                for (i in 0 until appsData.length()) {
                    val appConfig = appsData.getJSONObject(i)
                    if (appConfig.getString("packageName") == PACKAGE_NAME) {
                        val settings = appConfig.getJSONObject("settings")
                        val adminSettings = parseSettings(settings)
                        
                        // Save to cache
                        prefs.edit()
                            .putString("cached_settings", settings.toString())
                            .putLong("cache_time", System.currentTimeMillis())
                            .apply()
                        
                        return@withContext adminSettings
                    }
                }
            }
            
            // Fallback to cache if remote fails
            val cachedJson = prefs.getString("cached_settings", null)
            if (cachedJson != null) {
                return@withContext parseSettings(JSONObject(cachedJson))
            }
            
            DEFAULT_SETTINGS
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback to cache on error
            val cachedJson = prefs.getString("cached_settings", null)
            if (cachedJson != null) {
                parseSettings(JSONObject(cachedJson))
            } else {
                DEFAULT_SETTINGS
            }
        }
    }
    
    private fun parseSettings(json: JSONObject): AdminSettings {
        return AdminSettings(
            googleSignInEnabled = json.optBoolean("googleSignInEnabled", false),
            googleSignInCountries = parseStringArray(json.optJSONArray("googleSignInCountries")),
            botsApiUrl = json.optString("botsApiUrl", "https://umingle.com/data/bots.json"),
            privacyPolicyUrl = json.optString("privacyPolicyUrl", ""),
            termsOfServiceUrl = json.optString("termsOfServiceUrl", ""),
            communityGuidelinesUrl = json.optString("communityGuidelinesUrl", ""),
            cookiePolicyUrl = json.optString("cookiePolicyUrl", ""),
            minimumAppVersion = json.optString("minimumAppVersion", ""),
            updateRequired = json.optBoolean("updateRequired", false),
            playStoreUrl = json.optString("playStoreUrl", "https://play.google.com/store/apps/details?id=chatonlive.com.aab"),
            webviewUrl = json.optString("webviewUrl", ""),
            newApp = json.optBoolean("newApp", false),
            newAppUrl = json.optString("newAppUrl", ""),
            botOnlyMode = json.optBoolean("botOnlyMode", false),
            appSubtitle = json.optString("appSubtitle", ""),
            showLiveUsers = json.optBoolean("showLiveUsers", true),
            liveUsersCount = json.optString("liveUsersCount", ""),
            liveUsersText = json.optString("liveUsersText", ""),
            loginButtonAreaBgColor = json.optString("loginButtonAreaBgColor", "")
        )
    }
    
    private fun parseStringArray(array: JSONArray?): List<String> {
        if (array == null) return emptyList()
        val list = mutableListOf<String>()
        for (i in 0 until array.length()) {
            list.add(array.getString(i))
        }
        return list
    }
    
    suspend fun isGoogleSignInEnabledForCountry(countryCode: String?, settings: AdminSettings): Boolean = withContext(Dispatchers.IO) {
        // 1. If global flag is true, Guest button should be hidden for EVERYONE
        if (settings.googleSignInEnabled) return@withContext true
        
        // 2. If country code is provided, check if it's in the mandatory list
        if (countryCode == null) return@withContext false
        
        val upperCode = countryCode.uppercase()
        // UK and GB are interchangeable
        return@withContext if (upperCode == "UK" || upperCode == "GB") {
            settings.googleSignInCountries.contains("UK") || settings.googleSignInCountries.contains("GB")
        } else {
            settings.googleSignInCountries.contains(upperCode)
        }
    }
}

