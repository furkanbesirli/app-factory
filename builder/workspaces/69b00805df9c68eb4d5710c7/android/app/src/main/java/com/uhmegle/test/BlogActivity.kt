package com.uhmegle.test

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
        val category: String
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
            lp.bottomMargin = dpToPx(16)
            layoutParams = lp
            radius = dpToPx(20).toFloat()
            cardElevation = dpToPx(4).toFloat()
            setCardBackgroundColor(Color.WHITE)
        }

        val inner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dpToPx(20), dpToPx(20), dpToPx(20), dpToPx(20))
        }

        // Category badge
        val badge = TextView(this).apply {
            text = article.category
            setTextColor(Color.WHITE)
            textSize = 11f
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            val bg = GradientDrawable().apply {
                setColor(article.categoryColor)
                cornerRadius = dpToPx(12).toFloat()
            }
            background = bg
            setPadding(dpToPx(12), dpToPx(4), dpToPx(12), dpToPx(4))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams = lp
        }
        inner.addView(badge)

        // Title
        val title = TextView(this).apply {
            text = article.title
            setTextColor(Color.parseColor("#1A1A1A"))
            textSize = 18f
            typeface = Typeface.create("sans-serif-bold", Typeface.BOLD)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(12)
            layoutParams = lp
        }
        inner.addView(title)

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
        inner.addView(date)

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
        inner.addView(excerpt)

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
        inner.addView(fullContent)

        // Read More button
        val readMore = TextView(this).apply {
            text = "Read More →"
            setTextColor(Color.parseColor("#F5A623"))
            textSize = 14f
            typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.topMargin = dpToPx(12)
            layoutParams = lp
        }
        inner.addView(readMore)

        // Toggle expand/collapse
        readMore.setOnClickListener {
            if (fullContent.visibility == View.GONE) {
                fullContent.visibility = View.VISIBLE
                excerpt.visibility = View.GONE
                readMore.text = "Show Less ↑"
            } else {
                fullContent.visibility = View.GONE
                excerpt.visibility = View.VISIBLE
                readMore.text = "Read More →"
            }
        }

        card.addView(inner)
        return card
    }

    private fun getArticles(): List<BlogArticle> {
        return listOf(
            BlogArticle(
                title = "What Makes Uhmeglee Different from Other Video Chat Apps?",
                date = "March 8, 2026",
                excerpt = "In a world full of dating apps and social networks, Uhmeglee stands out by bringing back the spontaneity of real human connection through instant video chat.",
                fullContent = """In a world full of dating apps and social networks, Uhmeglee stands out by bringing back the spontaneity of real human connection through instant video chat.

Unlike traditional platforms that require profiles, bios, and endless swiping, Uhmeglee connects you face-to-face with a real person in seconds. There are no algorithms deciding who you should talk to based on your data — it's pure, unfiltered human interaction.

Our mission is simple: make it easy for anyone, anywhere, to have a genuine conversation with a stranger. Whether you're looking to practice a new language, share ideas across cultures, or simply have a fun chat during a break, Uhmeglee is designed for those moments.

With features like anonymous browsing, one-tap matching, and 24/7 moderation, we've built a platform that prioritizes both excitement and safety. Welcome to a new era of social connection.""",
                categoryColor = Color.parseColor("#F5A623"),
                category = "About Us"
            ),
            BlogArticle(
                title = "How to Stay Safe While Video Chatting with Strangers",
                date = "March 5, 2026",
                excerpt = "Video chatting with strangers can be exciting, but safety should always come first. Here are our top tips for a secure experience on Uhmeglee.",
                fullContent = """Video chatting with strangers can be exciting, but safety should always come first. Here are our top tips for a secure experience on Uhmeglee.

1. Never share personal information — This includes your full name, address, phone number, school, or workplace. Keep things light and fun.

2. Trust your instincts — If a conversation makes you uncomfortable at any point, hit the "Next" button immediately. You're always in control.

3. Use the Report feature — Our moderation team works 24/7. If someone violates our community guidelines, reporting helps us keep the platform safe for everyone.

4. Keep your background neutral — Before starting a video chat, make sure there's nothing visible in your background that could reveal your location or personal details.

5. Be respectful — The golden rule applies here too. Treat everyone with kindness and you'll have a much better experience.

At Uhmeglee, your safety is our top priority. We use advanced moderation tools and a dedicated human team to ensure every interaction meets our community standards.""",
                categoryColor = Color.parseColor("#4CAF50"),
                category = "Safety"
            ),
            BlogArticle(
                title = "5 Reasons Why Random Video Chat Is Making a Comeback",
                date = "March 1, 2026",
                excerpt = "Random video chat platforms are experiencing a massive resurgence. Here's why millions are choosing spontaneous connections over curated social feeds.",
                fullContent = """Random video chat platforms are experiencing a massive resurgence. Here's why millions are choosing spontaneous connections over curated social feeds.

1. Authenticity over perfection — People are tired of filtered photos and rehearsed bios. Video chat shows the real you, and that's refreshing.

2. Instant gratification — No waiting for matches, no endless messaging before meeting. On Uhmeglee, you're in a live conversation within seconds.

3. Breaking social bubbles — Social media algorithms keep showing us the same type of content and people. Random video chat introduces you to perspectives and cultures you'd never encounter otherwise.

4. Combat loneliness — Studies show that face-to-face interaction, even virtual, significantly reduces feelings of isolation. A five-minute conversation with a stranger can genuinely brighten your day.

5. It's just fun — There's an undeniable thrill in not knowing who you'll meet next. Every click is a new adventure, a new story, a new possibility.

The future of social connection isn't about more followers — it's about more genuine moments. And that's exactly what Uhmeglee delivers.""",
                categoryColor = Color.parseColor("#2196F3"),
                category = "Trends"
            ),
            BlogArticle(
                title = "Building a Global Community: Stories from Uhmeglee Users",
                date = "February 25, 2026",
                excerpt = "From Tokyo to São Paulo, Uhmeglee connects people across continents. Here are some heartwarming stories from our global community.",
                fullContent = """From Tokyo to São Paulo, Uhmeglee connects people across continents. Here are some heartwarming stories from our global community.

"I started using Uhmeglee to practice my English. I'm from South Korea, and within a week I had conversations with people from Canada, Australia, and the UK. My confidence has skyrocketed!" — Ji-yeon, Seoul

"I was going through a tough time and honestly just needed someone to talk to. The randomness of Uhmeglee means there's no pressure — I had a 30-minute conversation with a stranger from Brazil who made me laugh harder than I had in months." — Marcus, London

"As a remote worker, I sometimes go days without talking to anyone face-to-face. Uhmeglee gives me that human interaction I was missing. It's become part of my daily routine." — Priya, Mumbai

These stories remind us why we built Uhmeglee in the first place. Technology should bring us closer, not further apart. Every connection on our platform is a small victory against the isolation that modern life can sometimes create.

Thank you to our incredible community for making Uhmeglee what it is today.""",
                categoryColor = Color.parseColor("#9C27B0"),
                category = "Community"
            ),
            BlogArticle(
                title = "What's Next for Uhmeglee: Our 2026 Roadmap",
                date = "February 20, 2026",
                excerpt = "We have big plans for Uhmeglee this year. From new features to expanded moderation, here's a sneak peek at what's coming next.",
                fullContent = """We have big plans for Uhmeglee this year. From new features to expanded moderation, here's a sneak peek at what's coming next.

Enhanced Matching — We're working on optional interest-based matching. You'll still be able to go fully random, but if you want to connect with someone who shares your love of music production or cooking, that option will be there.

Text Chat Mode — Sometimes you're in a place where video isn't possible. We're adding a text-only mode so you can chat anytime, anywhere.

Improved Safety Features — Our AI moderation system is getting a major upgrade. We're implementing real-time content detection that can identify and act on policy violations faster than ever.

Localization — Uhmeglee will soon be available in 12+ languages, making the app more accessible to users worldwide.

Creator Partnerships — We're exploring partnerships with content creators who share our mission of genuine human connection.

Stay tuned for updates, and as always, thank you for being part of the Uhmeglee community. The best is yet to come!""",
                categoryColor = Color.parseColor("#FF5722"),
                category = "Updates"
            )
        )
    }
}
