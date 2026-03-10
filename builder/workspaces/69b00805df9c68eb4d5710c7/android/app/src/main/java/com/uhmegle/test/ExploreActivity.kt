package com.uhmegle.test

import android.os.Bundle
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity

class ExploreActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_explore)

        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, true)
        val controller = androidx.core.view.WindowCompat.getInsetsController(window, window.decorView)
        controller.isAppearanceLightStatusBars = true

        val btnClose = findViewById<ImageButton>(R.id.btnClose)
        btnClose.setOnClickListener {
            finish()
        }
    }
}
