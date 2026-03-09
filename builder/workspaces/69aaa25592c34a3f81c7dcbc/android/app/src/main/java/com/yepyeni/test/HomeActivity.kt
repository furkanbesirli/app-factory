package com.yepyeni.test

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.lifecycle.lifecycleScope
import com.yepyeni.test.review.ReviewBottomSheet
import com.yepyeni.test.review.ReviewGate
import com.yepyeni.test.services.AdminService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.graphics.Bitmap


class HomeActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var adminService: AdminService
    
    private var botOnlyMode = false
    private var navigatingToVideo = false

    companion object {
        /** LoginActivity passes this extra so we trigger the delayed review check */
        const val EXTRA_CHECK_REVIEW = "extra_check_review"
    }
    
    private val PERMISSION_REQUEST_CODE = 1001


    
    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, true)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)
        
        adminService = AdminService(this)
        
        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)
        
        setupWebView()
        requestPermissions()

        // ── Review: count this as a session ────────────────────────────────
        lifecycleScope.launch(Dispatchers.IO) {
            ReviewGate.recordSession(applicationContext)
        }

        // ── Review: delayed post-login check (triggered by LoginActivity) ──
        if (intent.getBooleanExtra(EXTRA_CHECK_REVIEW, false)) {
            lifecycleScope.launch {
                // Wait 25 seconds so the WebView has loaded and user is settled
                delay(25_000L)
                val shouldShow = ReviewGate.shouldShowPrompt(applicationContext, "post_login")
                if (shouldShow) showReviewSheet()
            }
        }
        
        // Load WebView with settings
        lifecycleScope.launch {
            try {
                kotlinx.coroutines.delay(300)
                val settings = adminService.loadAdminSettings(false)
                botOnlyMode = settings.botOnlyMode
                
                // 1. Check if new app redirect is required - this takes priority
                if (settings.newApp && settings.newAppUrl.isNotEmpty()) {
                    showNewAppDialog(settings.newAppUrl)
                    return@launch // Stop loading this app
                }
                
                // 2. Check if update is required (mandatory update)
                val currentVersion = "1.0.0" // Should ideally use BuildConfig.VERSION_NAME
                if (settings.updateRequired || isVersionSmaller(currentVersion, settings.minimumAppVersion)) {
                    showUpdateDialog(settings.playStoreUrl)
                    return@launch // Stop loading this app
                }
                
                val urlToLoad = if (settings.webviewUrl.isNotEmpty()) {
                    settings.webviewUrl
                } else {
                    "https://yepyeni.com"
                }
                
                loadWebView(urlToLoad)
                
            } catch (e: Exception) {
                // Return to default behaviors if something fails
                botOnlyMode = false
                loadWebView("https://yepyeni.com")
            }
        }
    }
    
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.mediaPlaybackRequiresUserGesture = false
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webSettings.javaScriptCanOpenWindowsAutomatically = true
        webSettings.setSupportMultipleWindows(true)
        webSettings.databaseEnabled = true
        webSettings.setGeolocationEnabled(true)
        
        // Video oynatma için önemli ayarlar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
        
        // Hardware acceleration için
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null)
        
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Convert HTTP to HTTPS for all domains
                if (url.startsWith("http://")) {
                    val httpsUrl = url.replace("http://", "https://")
                    view?.loadUrl(httpsUrl)
                    return true
                }
                
                return false
            }
            
            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                
                // If cleartext error, try HTTPS
                if (error?.errorCode == android.webkit.WebViewClient.ERROR_HOST_LOOKUP ||
                    error?.description?.toString()?.contains("CLEARTEXT", ignoreCase = true) == true) {
                    val url = request?.url?.toString()
                    if (url != null && url.startsWith("http://")) {
                        val httpsUrl = url.replace("http://", "https://")
                        view?.loadUrl(httpsUrl)
                    }
                }
            }
            
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = android.view.View.GONE
                // Video sayfasında JavaScript'i inject et
                injectJavaScript()
                // Video sayfası ise bir süre sonra tekrar inject et (dinamik içerik için)
                if (url?.contains("/video") == true) {
                    webView.postDelayed({
                        injectJavaScript()
                    }, 1000)
                }
            }
            
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = android.view.View.VISIBLE
            }
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            
            override fun getDefaultVideoPoster(): Bitmap? {
            
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request != null) {
                    val resources = request.resources
                    
                    var allGranted = true
                    
                    val hasCamera = ContextCompat.checkSelfPermission(
                        this@HomeActivity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    val hasAudio = ContextCompat.checkSelfPermission(
                        this@HomeActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                    
                    if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) && !hasCamera) allGranted = false
                    if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) && !hasAudio) allGranted = false
                    
                    if (allGranted) {
                        request.grant(resources)
                    } else {
                        request.deny()
                        runOnUiThread {
                            requestPermissions()
                        }
                    }
                }
            }
            
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }
            
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                consoleMessage?.let {
                    android.util.Log.d(
                        "WebViewConsole",
                        "${it.message()} -- From line ${it.lineNumber()} of ${it.sourceId()}"
                    )
                }
                return true
            }
        }
        
        webView.addJavascriptInterface(WebAppInterface(), "Android")

        // ── AndroidBridge: receives positive events from the website ───────
        // JS usage: window.AndroidBridge.onPositiveEvent("completed_first_chat")
        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")
    }
    
    private fun loadWebView(url: String) {
        webView.loadUrl(url)
    }
    
    private fun injectJavaScript() {
        val isVideoPage = webView.url?.contains("/video") == true
        
        val js = if (isVideoPage) {
            getVideoPageJavaScript()
        } else {
            getHomePageJavaScript()
        }
        
        webView.evaluateJavascript(js, null)
    }
    
    private fun getHomePageJavaScript(): String {
        return """
            (function() {
                if (window.__UHM_HOME_INJECTED__) return true;
                window.__UHM_HOME_INJECTED__ = true;
                
                window.__UHM_NAV_LOCK__ = false;
                
                // Console.log capture
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.log = function(...args) {
                    originalLog.apply(console, args);
                    if (window.Android) {
                        window.Android.onConsoleLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                    }
                };
                
                console.error = function(...args) {
                    originalError.apply(console, args);
                    const errorMessage = args.map(a => {
                        if (typeof a === 'object') {
                            if (a && Object.keys(a).length === 0) return null;
                            return JSON.stringify(a);
                        }
                        return String(a);
                    }).filter(m => m !== null && m !== '' && m !== '{}').join(' ');
                    
                    if (errorMessage && errorMessage.trim() !== '' && window.Android) {
                        window.Android.onConsoleLog('error', errorMessage);
                    }
                };
                
                console.warn = function(...args) {
                    originalWarn.apply(console, args);
                    if (window.Android) {
                        window.Android.onConsoleLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                    }
                };
                
                // Video button click handler
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (!link) return;
                    
                    const href = link.getAttribute('href');
                    if (!href) return;
                    
                    if (href === '/video' || href.startsWith('/video')) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (window.__UHM_NAV_LOCK__) return false;
                        window.__UHM_NAV_LOCK__ = true;
                        setTimeout(() => { window.__UHM_NAV_LOCK__ = false; }, 3000);
                        
                        const botOnlyMode = $botOnlyMode;
                        const baseUrl = window.location.origin;
                        const videoUrl = botOnlyMode
                            ? baseUrl + '/video?mode=matches'
                            : baseUrl + '/video';
                        
                        console.log('[APP] 📹 Video link intercepted:', videoUrl);
                        
                        if (window.Android) {
                            window.Android.onNavigateToVideo(videoUrl);
                        }
                        
                        return false;
                    }
                }, true);
            })();
            true;
        """.trimIndent().replace("$botOnlyMode", botOnlyMode.toString())
    }
    
    private fun getVideoPageJavaScript(): String {
        return """
            (function() {
                if (window.__gum_overridden__) return true;
                window.__gum_overridden__ = true;
                
                // Console.log capture
                const originalLog = console.log;
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.log = function(...args) {
                    originalLog.apply(console, args);
                    if (window.Android) {
                        window.Android.onConsoleLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                    }
                };
                
                console.error = function(...args) {
                    originalError.apply(console, args);
                    if (window.Android) {
                        const errorMessage = args.map(a => {
                            if (typeof a === 'object') {
                                if (a && Object.keys(a).length === 0) return null;
                                return JSON.stringify(a);
                            }
                            return String(a);
                        }).filter(m => m !== null && m !== '' && m !== '{}').join(' ');
                        
                        if (errorMessage && errorMessage.trim() !== '') {
                            window.Android.onConsoleLog('error', errorMessage);
                        }
                    }
                };
                
                console.warn = function(...args) {
                    originalWarn.apply(console, args);
                    if (window.Android) {
                        window.Android.onConsoleLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
                    }
                };
                
                // Video elementlerini düzgün göstermek için CSS injection
                const style = document.createElement('style');
                style.textContent = \`
                    video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        background: #000 !important;
                        background-color: #000 !important;
                        z-index: 1 !important;
                        display: block !important;
                    }
                    /* Tüm media control'ları gizle */
                    video::-webkit-media-controls {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                    video::-webkit-media-controls-panel {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                    video::-webkit-media-controls-play-button {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    video::-webkit-media-controls-start-playback-button {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    video::-webkit-media-controls-overlay-play-button {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    /* Poster image'i gizle */
                    video::before {
                        display: none !important;
                        content: none !important;
                    }
                    video::after {
                        display: none !important;
                        content: none !important;
                    }
                    /* Video container'ları siyah yap */
                    .video-container,
                    [class*="video"],
                    [id*="video"],
                    [class*="Video"],
                    [id*="Video"] {
                        width: 100% !important;
                        height: 100% !important;
                        background: #000 !important;
                        background-color: #000 !important;
                    }
                    /* Video yüklenene kadar siyah ekran göster */
                    video:not([src]) {
                        background: #000 !important;
                        background-color: #000 !important;
                    }
                    /* Video üzerindeki overlay'leri gizle */
                    video + *,
                    video ~ * {
                        pointer-events: none !important;
                    }
                    /* Play button overlay'lerini gizle - tüm varyasyonlar */
                    [class*="play"],
                    [id*="play"],
                    [class*="Play"],
                    [id*="Play"],
                    button[class*="play"],
                    button[id*="play"],
                    .play-button,
                    .playButton,
                    .play-btn,
                    [class*="play-button"],
                    [class*="playButton"],
                    [class*="play-btn"],
                    video::before,
                    video::after {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        width: 0 !important;
                        height: 0 !important;
                        content: none !important;
                    }
                    /* Video poster image'ini gizle */
                    video[poster] {
                        background-image: none !important;
                    }
                    video[poster]::before {
                        display: none !important;
                        content: none !important;
                    }
                    /* Video elementinin içindeki tüm child elementleri kontrol et */
                    video > * {
                        pointer-events: none !important;
                    }
                \`;
                document.head.appendChild(style);
                
                // Video elementlerini otomatik oynat ve play butonunu gizle
                function setupVideos() {
                    const videos = document.querySelectorAll('video');
                    videos.forEach(video => {
                        // Poster'ı kaldır - siyah ekran için
                        video.removeAttribute('poster');
                        video.poster = '';
                        
                        // WebM yerine MP4'e zorla (Android WebView'da daha iyi destek)
                        if (video.children && video.children.length > 0) {
                            const sources = Array.from(video.children).filter(child => child.tagName === 'SOURCE');
                            sources.forEach(source => {
                                const src = source.getAttribute('src') || source.getAttribute('data-src');
                                const type = source.getAttribute('type') || '';
                                
                                // WebM source'u bul ve MP4'e çevir
                                if (type.includes('webm') || (src && src.includes('.webm'))) {
                                    const mp4Src = src ? src.replace('.webm', '.mp4').replace('webm', 'mp4') : null;
                                    if (mp4Src) {
                                        source.setAttribute('src', mp4Src);
                                        source.setAttribute('type', 'video/mp4');
                                        console.log('[APP] 🔄 Converted WebM to MP4:', mp4Src);
                                    }
                                }
                            });
                        }
                        
                        // Video src'de WebM varsa MP4'e çevir
                        if (video.src && video.src.includes('.webm')) {
                            const mp4Src = video.src.replace('.webm', '.mp4').replace('webm', 'mp4');
                            video.src = mp4Src;
                            console.log('[APP] 🔄 Converted video src WebM to MP4:', mp4Src);
                        }
                        
                        // Play butonunu tamamen gizle
                        video.controls = false;
                        video.setAttribute('playsinline', 'true');
                        video.setAttribute('webkit-playsinline', 'true');
                        video.setAttribute('preload', 'auto');
                        video.setAttribute('muted', 'false');
                        
                        // Video elementini siyah arka plan ile göster
                        video.style.backgroundColor = '#000';
                        video.style.background = '#000';
                        video.style.display = 'block';
                        video.style.position = 'relative';
                        video.style.zIndex = '1';
                        
                        // Video yüklenene kadar siyah ekran göster
                        if (!video.src && !video.srcObject) {
                            video.style.display = 'block';
                            video.style.background = '#000';
                            video.style.backgroundColor = '#000';
                        }
                        
                        // Video elementinin üzerindeki tüm overlay'leri kaldır
                        const videoParent = video.parentElement;
                        if (videoParent) {
                            const siblings = Array.from(videoParent.children);
                            siblings.forEach(child => {
                                if (child !== video && (child.classList.contains('play') || 
                                    child.id.includes('play') || 
                                    child.tagName === 'BUTTON' ||
                                    child.style.position === 'absolute' ||
                                    child.style.position === 'fixed')) {
                                    child.style.display = 'none';
                                    child.style.opacity = '0';
                                    child.style.visibility = 'hidden';
                                    child.style.pointerEvents = 'none';
                                }
                            });
                        }
                        
                        // Video container'ındaki tüm play button'ları gizle
                        const playButtons = videoParent ? videoParent.querySelectorAll('[class*="play"], [id*="play"], button, .play-button, [class*="Play"], [id*="Play"]') : [];
                        playButtons.forEach(btn => {
                            if (btn !== video && !video.contains(btn)) {
                                btn.style.display = 'none';
                                btn.style.opacity = '0';
                                btn.style.visibility = 'hidden';
                                btn.style.pointerEvents = 'none';
                            }
                        });
                        
                        // Video yüklendiğinde otomatik oynat
                        const playVideo = function() {
                            video.style.backgroundColor = '#000';
                            video.style.background = '#000';
                            video.play().catch(e => {
                                console.log('[APP] Play error:', e);
                                // Hata olsa bile siyah ekran göster
                                video.style.backgroundColor = '#000';
                                video.style.background = '#000';
                            });
                        };
                        
                        video.addEventListener('loadedmetadata', playVideo);
                        video.addEventListener('canplay', playVideo);
                        video.addEventListener('loadeddata', playVideo);
                        
                        // Video başladığında siyah arka planı koru
                        video.addEventListener('play', function() {
                            video.style.backgroundColor = '#000';
                            video.style.background = '#000';
                        });
                        
                        // Video durduğunda bile siyah ekran göster
                        video.addEventListener('pause', function() {
                            video.style.backgroundColor = '#000';
                            video.style.background = '#000';
                        });
                        
                        // Video hata verdiğinde siyah ekran göster
                        video.addEventListener('error', function() {
                            video.style.backgroundColor = '#000';
                            video.style.background = '#000';
                            console.log('[APP] Video error, showing black screen');
                        });
                        
                        // Otomatik oynatmayı dene
                        setTimeout(function() {
                            const playPromise = video.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(error => {
                                    console.log('[APP] Auto-play prevented:', error);
                                    // Auto-play engellense bile siyah ekran göster
                                    video.style.backgroundColor = '#000';
                                    video.style.background = '#000';
                                });
                            }
                        }, 100);
                    });
                }
                
                // Sayfa yüklendiğinde ve DOM değiştiğinde video'ları ayarla
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', setupVideos);
                } else {
                    setupVideos();
                }
                
                // MutationObserver ile dinamik eklenen video'ları yakala
                const observer = new MutationObserver(function(mutations) {
                    setupVideos();
                    // Play button'ları sürekli gizle
                    const playButtons = document.querySelectorAll('[class*="play"], [id*="play"], [class*="Play"], [id*="Play"], button[class*="play"], button[id*="play"]');
                    playButtons.forEach(btn => {
                        if (btn.tagName === 'VIDEO' || btn.closest('video')) return;
                        btn.style.display = 'none';
                        btn.style.opacity = '0';
                        btn.style.visibility = 'hidden';
                        btn.style.pointerEvents = 'none';
                    });
                });
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'id', 'style']
                });
                
                // Check play buttons less frequently to save CPU
                setInterval(function() {
                    const playButtons = document.querySelectorAll('[class*="play"], [id*="play"], [class*="Play"], [id*="Play"], button[class*="play"], button[id*="play"]');
                    playButtons.forEach(btn => {
                        if (btn.tagName === 'VIDEO' || btn.closest('video')) return;
                        btn.style.display = 'none';
                        btn.style.opacity = '0';
                        btn.style.visibility = 'hidden';
                        btn.style.pointerEvents = 'none';
                    });
                }, 2000);
                
                // getUserMedia override
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
                    navigator.mediaDevices.getUserMedia = function(constraints) {
                        console.log('[APP] 🎥 getUserMedia called with constraints:', JSON.stringify(constraints));
                        
                        if (window.Android) {
                            window.Android.onGetUserMediaRequest(JSON.stringify(constraints));
                        }
                        
                        return originalGetUserMedia(constraints).catch(async function(error) {
                            console.error('[APP] ❌ getUserMedia error:', error);
                            
                            if (window.Android) {
                                window.Android.onGetUserMediaError(JSON.stringify({
                                    name: error.name,
                                    message: error.message
                                }));
                            }
                            
                            // NotReadableError için split-capture fallback
                            if (error && error.name === 'NotReadableError' && constraints && constraints.audio && constraints.video) {
                                console.log('[APP] 🔄 NotReadableError: trying split audio/video capture...');
                                try {
                                    const videoStream = await originalGetUserMedia({ video: true, audio: false });
                                    await new Promise(r => setTimeout(r, 400));
                                    const audioStream = await originalGetUserMedia({ video: false, audio: true });
                                    const mixed = new MediaStream();
                                    videoStream.getVideoTracks().forEach(t => mixed.addTrack(t));
                                    audioStream.getAudioTracks().forEach(t => mixed.addTrack(t));
                                    console.log('[APP] ✅ Split capture successful');
                                    return mixed;
                                } catch (splitError) {
                                    console.error('[APP] ❌ Split capture failed:', splitError);
                                    return Promise.reject(error);
                                }
                            }
                            
                            // Permission error ise tekrar dene
                            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.message.includes('Permission')) {
                                console.log('[APP] 🔄 Retrying getUserMedia after permission error...');
                                return new Promise(function(resolve, reject) {
                                    setTimeout(function() {
                                        originalGetUserMedia(constraints).then(resolve).catch(reject);
                                    }, 500);
                                });
                            }
                            
                            return Promise.reject(error);
                        });
                    };
                }
                
                console.log('[APP] ✅ getUserMedia API override injected');
            })();
            true;
        """.trimIndent()
    }
    
    private fun requestPermissions() {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missingPermissions.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            if (!allGranted) {
                // Check if user selected "Don't ask again"
                var permanentlyDenied = false
                for (permission in permissions) {
                    if (!ActivityCompat.shouldShowRequestPermissionRationale(this, permission)) {
                        permanentlyDenied = true
                        break
                    }
                }
                
                if (permanentlyDenied) {
                    AlertDialog.Builder(this)
                        .setTitle("Permissions Required")
                        .setMessage("Camera and microphone permissions are mandatory for video chat. Please enable them in app settings to continue.")
                        .setPositiveButton("Open Settings") { _, _ ->
                            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                            val uri = Uri.fromParts("package", packageName, null)
                            intent.data = uri
                            startActivity(intent)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    AlertDialog.Builder(this)
                        .setTitle("Permission Required")
                        .setMessage("Camera & microphone permissions are required for video chat.")
                        .setPositiveButton("OK", null)
                        .show()
                }
            }
        }
    }
    
    inner class WebAppInterface {
        @JavascriptInterface
        fun onConsoleLog(level: String, message: String) {
            runOnUiThread {
                when (level) {
                    "error" -> android.util.Log.e("WebView", message)
                    "warn" -> android.util.Log.w("WebView", message)
                    else -> android.util.Log.d("WebView", message)
                }
            }
        }
        
        @JavascriptInterface
        fun onNavigateToVideo(url: String) {
            runOnUiThread {
                if (navigatingToVideo) return@runOnUiThread
                navigatingToVideo = true
                
                val hasCamera = ContextCompat.checkSelfPermission(
                    this@HomeActivity,
                    Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED
                
                val hasAudio = ContextCompat.checkSelfPermission(
                    this@HomeActivity,
                    Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED
                
                if (!hasCamera || !hasAudio) {
                    Toast.makeText(this@HomeActivity, "Camera & microphone permissions are required.", Toast.LENGTH_SHORT).show()
                    requestPermissions()
                    navigatingToVideo = false
                    return@runOnUiThread
                }
                
                webView.postDelayed({
                    webView.evaluateJavascript("window.location.href = '$url'; true;", null)
                    navigatingToVideo = false
                }, 600)
            }
        }
        
        @JavascriptInterface
        fun onGetUserMediaRequest(constraints: String) {
            android.util.Log.d("HomeActivity", "getUserMedia request: $constraints")
        }
        
        @JavascriptInterface
        fun onGetUserMediaError(error: String) {
            android.util.Log.e("HomeActivity", "getUserMedia error: $error")
        }
    }

    // ── AndroidBridge ─────────────────────────────────────────────────────────
    /**
     * JavaScript interface registered as "AndroidBridge".
     * The website (or injected JS) can call:
     *   window.AndroidBridge.onPositiveEvent("completed_first_chat")
     *
     * This triggers the review gate check and, if all conditions pass, shows
     * the ReviewBottomSheet on the main thread.
     *
     * NOTE: @JavascriptInterface methods are called on a background thread.
     * Use runOnUiThread / lifecycleScope for any UI operations.
     */
    inner class AndroidBridge {
        @JavascriptInterface
        fun onPositiveEvent(eventName: String) {
            android.util.Log.d("AndroidBridge", "onPositiveEvent: $eventName")
            // Switch to Main for coroutine + UI work
            lifecycleScope.launch {
                val shouldShow = ReviewGate.shouldShowPrompt(applicationContext, eventName)
                if (shouldShow) {
                    showReviewSheet()
                }
            }
        }
    }

    // ── Review helpers ────────────────────────────────────────────────────────

    /**
     * Safely shows the ReviewBottomSheet. Guards against a finishing Activity.
     * Must be called on the Main thread.
     */
    private fun showReviewSheet() {
        if (isFinishing || isDestroyed) return
        ReviewBottomSheet.show(this)
    }
    
    private fun showNewAppDialog(targetUrl: String) {
        // Inflate the custom layout
        val builder = AlertDialog.Builder(this)
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
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            AlertDialog.Builder(this)
                .setTitle("Exit yepyeni")
                .setMessage("Are you sure you want to close yepyeni?")
                .setPositiveButton("Yes") { _, _ -> finish() }
                .setNegativeButton("Stay", null)
                .show()
        }
    }
    private fun showUpdateDialog(playStoreUrl: String) {
        AlertDialog.Builder(this)
            .setTitle("Update Required")
            .setMessage("A new version of yepyeni is available. Please update to continue.")
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

