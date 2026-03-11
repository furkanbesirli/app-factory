package chatonlive.com.aab

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.view.WindowCompat

class BlogActivity : AppCompatActivity() {

    data class BlogArticle(
        val title: String,
        val date: String,
        val excerpt: String,
        val fullContent: String,
        val categoryColor: Int,
        val category: String,
        val imageResId: Int
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blog)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.isAppearanceLightStatusBars = true

        findViewById<ImageButton>(R.id.btnBlogBack).setOnClickListener {
            finish()
        }

        val container = findViewById<LinearLayout>(R.id.blogContainer)
        val articles = getArticles()

        articles.forEach { article ->
            container.addView(createArticleCard(article))
        }
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp.toFloat(), resources.displayMetrics
        ).toInt()
    }

    private fun createArticleCard(article: BlogArticle): CardView {
        val card = CardView(this).apply {
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = dpToPx(24)
            layoutParams = lp
            radius = dpToPx(24).toFloat()
            cardElevation = dpToPx(6).toFloat()
            setCardBackgroundColor(Color.WHITE)
        }

        val inner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        // Article Image
        val image = ImageView(this).apply {
            setImageResource(article.imageResId)
            scaleType = ImageView.ScaleType.CENTER_CROP
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(180)
            )
            layoutParams = lp
        }
        inner.addView(image)

        val contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dpToPx(20), dpToPx(16), dpToPx(20), dpToPx(20))
        }

        // Category badge
        val badge = TextView(this).apply {
            text = article.category.uppercase()
            setTextColor(Color.WHITE)
            textSize = 10f
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            val bg = GradientDrawable().apply {
                setColor(article.categoryColor)
                cornerRadius = dpToPx(6).toFloat()
            }
            background = bg
            setPadding(dpToPx(10), dpToPx(4), dpToPx(10), dpToPx(4))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams = lp
        }
        contentLayout.addView(badge)

        // Title
        val title = TextView(this).apply {
            text = article.title
            setTextColor(Color.parseColor("#1A1A1A"))
            textSize = 20f
            typeface = Typeface.create("sans-serif-bold", Typeface.BOLD)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(12)
            layoutParams = lp
        }
        contentLayout.addView(title)

        // Date
        val date = TextView(this).apply {
            text = article.date
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 12f
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(4)
            layoutParams = lp
        }
        contentLayout.addView(date)

        // Excerpt
        val excerpt = TextView(this).apply {
            text = article.excerpt
            setTextColor(Color.parseColor("#6B7280"))
            textSize = 14f
            setLineSpacing(0f, 1.4f)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(10)
            layoutParams = lp
        }
        contentLayout.addView(excerpt)

        // Full content (initially hidden)
        val fullContent = TextView(this).apply {
            text = article.fullContent
            setTextColor(Color.parseColor("#4B5563"))
            textSize = 14f
            setLineSpacing(0f, 1.5f)
            visibility = View.GONE
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(10)
            layoutParams = lp
        }
        contentLayout.addView(fullContent)

        // Read More button
        val readMore = TextView(this).apply {
            text = "READ MORE →"
            setTextColor(Color.parseColor("#1565C0"))
            textSize = 13f
            typeface = Typeface.create("sans-serif-medium", Typeface.BOLD)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(16)
            layoutParams = lp
        }
        contentLayout.addView(readMore)

        // Toggle expand/collapse
        readMore.setOnClickListener {
            if (fullContent.visibility == View.GONE) {
                fullContent.visibility = View.VISIBLE
                excerpt.visibility = View.GONE
                readMore.text = "SHOW LESS ↑"
            } else {
                fullContent.visibility = View.GONE
                excerpt.visibility = View.VISIBLE
                readMore.text = "READ MORE →"
            }
        }

        inner.addView(contentLayout)
        card.addView(inner)
        return card
    }

    private fun getArticles(): List<BlogArticle> {
        return listOf(
            BlogArticle(
                title = "Live Video Chat: The New Era of Socializing",
                date = "March 11, 2026",
                excerpt = "Texting is no longer enough! Why do people prefer instant, face-to-face communication? Discover the rise of live video chat.",
                fullContent = """Traditional social media platforms no longer feel 'real' enough for people. Instead of filtered photos and waiting hours for message replies, people now prefer platforms like Umingle where they can establish instant social connections.
                
Live video chat allows you to communicate with someone on the other side of the world as if they were right next to you, regardless of distance. This is not just a chat, but also a great opportunity to get to know different cultures and gain new perspectives.

At Umingle, we are here to manage this process in the fastest and safest way possible. With a single tap, you can open a door to a new world. Remember, the most sincere moments are always the spontaneous ones.""",
                categoryColor = Color.parseColor("#1565C0"),
                category = "Live",
                imageResId = R.drawable.blog_v3_live
            ),
            BlogArticle(
                title = "The Benefits of 1v1 Video Private Calls",
                date = "March 10, 2026",
                excerpt = "Tired of crowded group chats? What you need to know about the privacy and in-depth communication provided by one-on-one calls.",
                fullContent = """Group chats can be fun, but real bonds are usually formed in one-on-one meetings. 1v1 video chat is a form of communication where there are no distractions and mutual interest is at its highest level.

Why should you prefer 1v1?
1. Focused Communication: You can truly listen to the other person and express yourself in the best way.
2. Privacy and Trust: Special moments between only two people, away from crowded rooms.
3. Deep Connections: The chance to establish a more meaningful and quality interaction in a short time.

Thanks to Umingle's improved 1v1 matching algorithm, you can start a private meeting with people who best suit your interests in seconds.""",
                categoryColor = Color.parseColor("#43A047"),
                category = "Trend",
                imageResId = R.drawable.blog_v3_consulting
            ),
            BlogArticle(
                title = "5 Golden Rules for Safe Chatting Online",
                date = "March 8, 2026",
                excerpt = "Protecting your safety while video chatting is crucial. Check out our safety guide prepared for you.",
                fullContent = """While meeting new people is exciting, you should never let your guard down in the digital world. Here are some important tips from the Umingle team:

1. Don't Share Sensitive Information: Never share your address, phone number, or financial information with strangers.
2. Trust Your Instincts: If the chat makes you uncomfortable, you can immediately press the 'Next' button or report the user.
3. Pay Attention to Your Background: Make sure the place where you are calling from does not contain details that would reveal your location.
4. Use the Reporting System: Our moderation team works 24/7. Don't hesitate to report those who violate community rules to us.
5. Be Kind: Mutual respect is the cornerstone of a safe environment.

At Umingle, we strive to provide the safest experience for you with our AI-supported moderation and live inspection team.""",
                categoryColor = Color.parseColor("#E53935"),
                category = "Safety",
                imageResId = R.drawable.blog_v3_secure
            ),
            BlogArticle(
                title = "A Global Community: Join the Umingle Family",
                date = "March 5, 2026",
                excerpt = "Thousands of people from all over the world meet on Umingle. Real user stories and global connections.",
                fullContent = """Umingle is not just an app, it's a giant community that removes borders. From Tokyo to Sao Paulo, from London to Istanbul, everyone is here!

A student who wants to learn a new language, a traveler curious about different cultures, or just a young person looking for a new friend... Umingle brings these different worlds together.

The stories shared by our users excite us more every day. We continue to work for a future where technology connects us more to each other. Are you ready to be part of this community?""",
                categoryColor = Color.parseColor("#8E24AA"),
                category = "Community",
                imageResId = R.drawable.blog_v3_community
            )
        )
    }
}
