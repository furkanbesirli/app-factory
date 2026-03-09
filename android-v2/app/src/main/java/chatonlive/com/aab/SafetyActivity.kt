package chatonlive.com.aab

import android.os.Bundle
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton

import android.widget.Toast

class SafetyActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_safety)

        findViewById<ImageButton>(R.id.btnPulseBack).setOnClickListener {
            finish()
        }

        findViewById<MaterialButton>(R.id.btnPulseAction).setOnClickListener {
            Toast.makeText(this, "Application sent! Our team will review your profile.", Toast.LENGTH_LONG).show()
        }
    }
}
