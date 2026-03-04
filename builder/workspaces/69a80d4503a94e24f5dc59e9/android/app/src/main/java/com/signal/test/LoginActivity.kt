package com.signal.test

import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.signal.test.services.AdminService
import com.signal.test.services.GoogleSignInService
import com.signal.test.services.LocationService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.core.view.WindowCompat
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class LoginActivity : AppCompatActivity() {
    private lateinit var googleSignInService: GoogleSignInService
    private lateinit var adminService: AdminService
    private lateinit var locationService: LocationService
    
    private lateinit var btnGoogleSignIn: MaterialButton
    private lateinit var btnGuestLogin: MaterialButton
    private lateinit var btnDiscover: MaterialButton
    private lateinit var btnSidebar: FloatingActionButton
    
    private lateinit var sidebarOverlay: View
    private lateinit var sidebar: View
    private lateinit var btnSidebarClose: View
    private lateinit var sidebarItemPrivacy: TextView
    private lateinit var sidebarItemTerms: TextView
    private lateinit var sidebarItemCommunity: TextView
    private lateinit var sidebarItemCookies: TextView
    private lateinit var sidebarItemSafety: TextView
    
    private lateinit var documentModal: CardView
    private lateinit var documentTitle: TextView
    private lateinit var documentContent: TextView
    private lateinit var documentProgress: ProgressBar
    private lateinit var btnDocumentClose: View
    
    private var sidebarVisible = false
    private var documentVisible = false
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
    
    companion object {
        private const val RC_SIGN_IN = 9001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        // Ensure status bar icons are dark for the light theme using Compat library for stability
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.isAppearanceLightStatusBars = true
        
        // Initialize services
        googleSignInService = GoogleSignInService(this)
        adminService = AdminService(this)
        locationService = LocationService()
        
        // Initialize views
        btnGoogleSignIn = findViewById(R.id.btnGoogleSignIn)
        btnGuestLogin = findViewById(R.id.btnGuestLogin)
        btnDiscover = findViewById(R.id.btnDiscover)
        btnSidebar = findViewById(R.id.btnSidebar)
        
        // Sidebar views
        sidebarOverlay = findViewById(R.id.sidebarOverlay)
        sidebar = findViewById(R.id.sidebar)
        btnSidebarClose = findViewById(R.id.btnSidebarClose)
        sidebarItemPrivacy = findViewById(R.id.sidebarItemPrivacy)
        sidebarItemTerms = findViewById(R.id.sidebarItemTerms)
        sidebarItemCommunity = findViewById(R.id.sidebarItemCommunity)
        sidebarItemCookies = findViewById(R.id.sidebarItemCookies)
        sidebarItemSafety = findViewById(R.id.sidebarItemSafety)
        
        // Document modal views
        documentModal = findViewById(R.id.documentModal)
        documentTitle = findViewById(R.id.documentTitle)
        documentContent = findViewById(R.id.documentContent)
        documentProgress = findViewById(R.id.documentProgress)
        btnDocumentClose = findViewById(R.id.btnDocumentClose)
        
        // Check if already signed in with a small delay to let UI settle
        lifecycleScope.launch {
            kotlinx.coroutines.delay(300)
            if (googleSignInService.isSignedIn()) {
                navigateToHome() // auto-resume: no review check
                return@launch
            }
            
            // Load admin settings - FORCE REFRESH to get latest apps.json for testing
            val settings = adminService.loadAdminSettings(true)
            
            // 1. New app redirect
            if (settings.newApp && settings.newAppUrl.isNotEmpty()) {
                showNewAppDialog(settings.newAppUrl)
                return@launch
            }
            
            // 2. Mandatory update
            val currentVersion = "1.0.0"
            if (settings.updateRequired || isVersionSmaller(currentVersion, settings.minimumAppVersion)) {
                showUpdateDialog(settings.playStoreUrl)
                return@launch
            }
            
            // First get country code
            val countryCode = locationService.getUserCountryCode()
            
            // 3. Update UI - USER RULES:
            // Rule 1: Google button is ALWAYS visible
            btnGoogleSignIn.visibility = View.VISIBLE
            
            // Rule 2: Guest button is HIDDEN if googleSignInEnabled is true
            // Rule 3: Guest button is HIDDEN if country is in the list
            val isCountryBlocked = countryCode != null && settings.googleSignInCountries.any { it.equals(countryCode, ignoreCase = true) }
            val shouldHideGuest = settings.googleSignInEnabled || isCountryBlocked
            
            btnGuestLogin.visibility = if (shouldHideGuest) View.GONE else View.VISIBLE
            findViewById<View>(R.id.dividerLayout).visibility = if (btnGuestLogin.visibility == View.VISIBLE) View.VISIBLE else View.GONE
            
            // DEBUG TOAST: Remove this when everything is confirmed working

        }
        
        // Set click listeners
        btnGoogleSignIn.setOnClickListener {
            signInWithGoogle()
        }
        
        btnGuestLogin.setOnClickListener {
            navigateToHome(checkReview = true) // guest login → trigger review check
        }
        
        // Sidebar listeners
        btnSidebar.setOnClickListener {
            openSidebar()
        }

        btnDiscover.setOnClickListener {
            val intent = Intent(this, ExploreActivity::class.java)
            startActivity(intent)
        }
        
        sidebarOverlay.setOnClickListener {
            closeSidebar()
        }
        
        btnSidebarClose.setOnClickListener {
            closeSidebar()
        }
        
        sidebarItemPrivacy.setOnClickListener {
            openDocument("privacy")
        }
        
        sidebarItemTerms.setOnClickListener {
            openDocument("terms")
        }
        
        sidebarItemCommunity.setOnClickListener {
            openDocument("community")
        }
        
        sidebarItemCookies.setOnClickListener {
            openDocument("cookies")
        }

        sidebarItemSafety.setOnClickListener {
            closeSidebar()
            val intent = Intent(this, SafetyActivity::class.java)
            startActivity(intent)
        }
        
        // Document modal listeners
        btnDocumentClose.setOnClickListener {
            closeDocument()
        }
    }
    
    private fun signInWithGoogle() {
        val signInIntent = googleSignInService.signInClient.signInIntent
        startActivityForResult(signInIntent, RC_SIGN_IN)
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == RC_SIGN_IN) {
            lifecycleScope.launch {
                val result = googleSignInService.handleSignInResult(data)
                if (result.success) {
                    navigateToHome(checkReview = true) // successful Google login → trigger review check
                } else {
                    if (result.error != "Sign in cancelled") {
                        Toast.makeText(this@LoginActivity, result.error ?: "Sign in failed", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }
    
    private fun navigateToHome(checkReview: Boolean = false) {
        val intent = Intent(this, HomeActivity::class.java).apply {
            // Signal HomeActivity to run the delayed review check after 25 s.
            // We only set this when the user actively logs in (not on auto-resume).
            if (checkReview) putExtra(HomeActivity.EXTRA_CHECK_REVIEW, true)
        }
        startActivity(intent)
        finish()
    }
    
    override fun onResume() {
        super.onResume()
        // Check if signed in when returning to this activity
        lifecycleScope.launch {
            if (googleSignInService.isSignedIn()) {
                navigateToHome() // returning to login screen: no review check
            }
        }
    }
    
    private fun openSidebar() {
        if (sidebarVisible) return
        sidebarVisible = true
        
        sidebarOverlay.visibility = View.VISIBLE
        sidebar.visibility = View.VISIBLE
        // Hide the main menu button when sidebar is open to prevent overlap
        btnSidebar.visibility = View.GONE
        
        // Animate sidebar
        val animator = ObjectAnimator.ofFloat(sidebar, "translationX", -sidebar.width.toFloat(), 0f)
        animator.duration = 300
        animator.start()
    }
    
    private fun closeSidebar() {
        if (!sidebarVisible) return
        sidebarVisible = false
        
        // Animate sidebar
        val animator = ObjectAnimator.ofFloat(sidebar, "translationX", 0f, -sidebar.width.toFloat())
        animator.duration = 300
        animator.addListener(object : android.animation.AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: android.animation.Animator) {
                sidebarOverlay.visibility = View.GONE
                sidebar.visibility = View.GONE
                // Show the main menu button again when sidebar is closed
                btnSidebar.visibility = View.VISIBLE
            }
        })
        animator.start()
    }
    
    private fun openDocument(docType: String) {
        closeSidebar()
        documentVisible = true
        documentModal.visibility = View.VISIBLE
        
        // Set title
        val title = when (docType) {
            "privacy" -> "Privacy Policy"
            "terms" -> "Terms of Service"
            "community" -> "Community Guidelines"
            "cookies" -> "Cookie Policy"
            else -> "Document"
        }
        documentTitle.text = title
        documentContent.text = "Loading..."
        
        // Load document
        lifecycleScope.launch {
            loadDocument(docType)
        }
    }

    private fun closeDocument() {
        documentVisible = false
        documentModal.visibility = View.GONE
        documentContent.text = "Loading..."
    }
    
    private suspend fun loadDocument(docType: String) = withContext(Dispatchers.IO) {
        try {
            // Get settings - try cache first to be fast, only fetch if needed logic is inside service
            // forcing false to use existing cache if available so UI doesn't hang
            val settings = adminService.loadAdminSettings(false)
            
            // Get URL
            val url = when (docType) {
                "privacy" -> settings.privacyPolicyUrl
                "terms" -> settings.termsOfServiceUrl
                "community" -> settings.communityGuidelinesUrl
                "cookies" -> settings.cookiePolicyUrl
                else -> ""
            }
            
            // Try to fetch from URL if available
            var content: String? = null
            if (url.isNotEmpty()) {
                content = fetchDocumentFromUrl(url)
            }
            
            // If fetch failed, no URL, or empty content, use default
            if (content.isNullOrBlank()) {
                content = getDefaultDocumentContent(docType)
            }
            
            // Update UI on main thread
            withContext(Dispatchers.Main) {
                documentContent.text = content
                documentProgress.visibility = View.GONE
            }
        } catch (e: Exception) {
            e.printStackTrace()
            withContext(Dispatchers.Main) {
                documentContent.text = getDefaultDocumentContent(docType)
                documentProgress.visibility = View.GONE
            }
        }
    }
    
    private suspend fun fetchDocumentFromUrl(url: String): String? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(url)
                .addHeader("Cache-Control", "no-cache")
                .build()
            
            val response = httpClient.newCall(request).execute()
            
            if (response.isSuccessful) {
                val contentType = response.header("Content-Type", "")
                val body = response.body?.string() ?: return@withContext null
                
                // If JSON, try to parse
                if (contentType?.contains("application/json") == true) {
                    try {
                        val json = JSONObject(body)
                        return@withContext json.optString("content")
                            .takeIf { it.isNotEmpty() }
                            ?: json.optString("text")
                            .takeIf { it.isNotEmpty() }
                            ?: json.optString("body")
                            .takeIf { it.isNotEmpty() }
                            ?: body
                    } catch (e: Exception) {
                        // Not valid JSON, return as text
                        return@withContext body
                    }
                }
                
                return@withContext body
            }
            
            null
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
    
    private fun getDefaultDocumentContent(docType: String): String {
        val dateFormat = SimpleDateFormat("MMMM dd, yyyy", Locale.US)
        val currentDate = dateFormat.format(Date())
        
        return when (docType) {
            "privacy" -> """UMINGLE PRIVACY POLICY
            
Last Updated: $currentDate

1. INTRODUCTION
Welcome to Umingle. We are committed to protecting your personal information and your right to privacy. This policy outlines how we handle your data when you use our mobile application.

2. INFORMATION WE COLLECT
- Authentication: When using Google Sign-In, we receive your basic profile information (name, email, profile picture).
- Device Data: We collect hardware model, OS version, and unique device identifiers to ensure app stability and security.
- Location: We may process approximate location data (Country level) to comply with local regulations and provide local matching.

3. HOW WE USE YOUR INFORMATION
We process your information for purposes based on legitimate business interests, the fulfillment of our contract with you, and compliance with our legal obligations. This includes providing the video chat service, maintaining safety, and improving app performance.

4. DATA SECURITY
We use a combination of administrative, technical, and physical security measures to help protect your personal information. Please be aware that no security measures are perfect or impenetrable.

5. YOUR RIGHTS
Depending on your location, you may have the right to access, rectify, or erase your personal data. You can manage your account settings within the app or contact us for assistance.

Contact: legal@umingleapp.com"""
            
            "terms" -> """UMINGLE TERMS OF SERVICE

Last Updated: $currentDate

1. AGREEMENT TO TERMS
These Terms of Service constitute a legally binding agreement made between you and Umingle. By accessing the app, you agree that you have read, understood, and agreed to be bound by all of these Terms.

2. ELIGIBILITY
You must be at least 18 years of age to use Umingle. By using the app, you represent and warrant that you are of legal age and have the right, authority, and capacity to enter into this agreement.

3. USER CONDUCT
You agree not to:
- Use the app for any illegal or unauthorized purpose.
- Harass, abuse, or harm another person during video chats.
- Record or distribute video streams without explicit consent.
- Transmit any worms, viruses, or code of a destructive nature.

4. CONTENT MODERATION
Umingle reserves the right to monitor interactions and remove any user who violates our safety standards or community guidelines without prior notice.

5. LIMITATION OF LIABILITY
Umingle provides its services on an "as is" and "as available" basis. We do not guarantee that the service will always be safe, secure, or error-free.

Contact: legal@umingleapp.com"""
            
            "community" -> """COMMUNITY GUIDELINES

Last Updated: $currentDate

1. THE UMINGLE MISSION
Umingle is built on the foundation of human connection. We strive to create a safe, respectful, and fun environment for everyone to meet new people.

2. BE KIND & RESPECTFUL
Treat others as you want to be treated. We have zero tolerance for hate speech, bullying, or discrimination based on race, religion, gender, or orientation.

3. SAFETY FIRST
- Keep your private details private.
- If you encounter a user making you uncomfortable, use the Report button immediately.
- Do not engage in or promote risky behavior.

4. NO INAPPROPRIATE CONTENT
Sexual content, nudity, and violence are strictly prohibited. Our automated and human moderation teams work 24/7 to keep the platform clean.

5. REPORTING & ENFORCEMENT
Violating these guidelines will result in warnings, temporary suspensions, or permanent bans. We take every report seriously.

Help us keep Umingle safe for everyone!"""
            
            "cookies" -> """COOKIE & STORAGE POLICY

Last Updated: $currentDate

1. HOW WE USE STORAGE
Umingle uses local storage and cookies to improve your experience and keep the app functional.

2. ESSENTIAL STORAGE
- Sessions: We store temporary session tokens to keep you logged in.
- Preferences: We save your theme and language settings locally on your device.

3. PERFORMANCE & ANALYTICS
We use internal identifiers to track app performance and crash reports, helping us fix bugs and optimize the user interface for your specific device.

4. THIRD-PARTY SERVICES
Our authentication provider (Google) may use cookies to manage the sign-in process and ensure the security of your account.

5. CONTROLLING YOUR DATA
You can clear your app cache or data in your Android device settings at any time, which will reset your preferences and log you out.

Questions? Contact: support@umingleapp.com"""
            
            else -> ""
        }
    }

    private fun showNewAppDialog(targetUrl: String) {
        // Inflate the custom layout
        val builder = androidx.appcompat.app.AlertDialog.Builder(this)
        val dialogView = layoutInflater.inflate(R.layout.dialog_new_app, null)
        
        builder.setView(dialogView)
        builder.setCancelable(false) // User must click the button
        
        val dialog = builder.create()
        
        // Make the dialog background transparent to show the card corner radius
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        
        val btnDownload = dialogView.findViewById<android.widget.Button>(R.id.btnDownloadNewApp)
        btnDownload.setOnClickListener {
            try {
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                intent.data = android.net.Uri.parse(targetUrl)
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Could not open link", Toast.LENGTH_SHORT).show()
            }
        }
        
        dialog.show()
    }
    private fun showUpdateDialog(playStoreUrl: String) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Update Required")
            .setMessage("A new version of Umingle is available. Please update to continue.")
            .setCancelable(false)
            .setPositiveButton("Update Now") { _, _ ->
                try {
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
                    intent.data = android.net.Uri.parse(playStoreUrl)
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Could not open Play Store", Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }
    
    private fun isVersionSmaller(current: String, minimum: String): Boolean {
        if (minimum.isEmpty()) return false
        try {
            val currParts = current.split(".").map { it.toInt() }
            val minParts = minimum.split(".").map { it.toInt() }
            
            val maxLength = maxOf(currParts.size, minParts.size)
            for (i in 0 until maxLength) {
                val curr = currParts.getOrNull(i) ?: 0
                val min = minParts.getOrNull(i) ?: 0
                if (curr < min) return true
                if (curr > min) return false
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }
}

