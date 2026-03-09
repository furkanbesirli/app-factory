package com.logoo.test.services

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class LocationService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(3, TimeUnit.SECONDS)
        .build()
    
    private val TEST_MODE_USA = false // Set to true for testing
    
    suspend fun getUserCountryCode(): String? = withContext(Dispatchers.IO) {
        if (TEST_MODE_USA) {
            return@withContext "US"
        }
        
        try {
            val request = Request.Builder()
                .url("https://tutube.net/country")
                .build()
            
            val response = client.newCall(request).execute()
            
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return@withContext null
                val data = JSONObject(responseBody)
                val countryCode = data.optJSONObject("country")?.optString("code")
                return@withContext countryCode?.uppercase()
            }
            
            null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    suspend fun shouldRequireGoogleSignIn(adminService: AdminService): Boolean = withContext(Dispatchers.IO) {
        val settings = adminService.loadAdminSettings(false)
        val countryCode = getUserCountryCode() ?: return@withContext false
        adminService.isGoogleSignInEnabledForCountry(countryCode, settings)
    }
}

