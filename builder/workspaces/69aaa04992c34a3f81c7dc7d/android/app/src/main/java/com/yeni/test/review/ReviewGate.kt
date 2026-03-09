package com.yeni.test.review

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import java.util.Calendar
import java.util.concurrent.TimeUnit

private val Context.reviewDataStore: DataStore<Preferences> by preferencesDataStore(name = "review_prefs")

/**
 * ReviewGate — Central decision engine for the in-app review prompt.
 *
 * Persists all state using Preferences DataStore. Encodes anti-annoyance rules:
 *  - Never show on the very first session (launchCount must be ≥ 2)
 *  - Must have ≥ 2 distinct calendar days of usage
 *  - Must not have been shown or attempted within 90 days
 *  - Must not have been shown today (once-per-day cap)
 *  - Deferred prompts wait until deferredUntil timestamp clears
 *  - "Never ask again" permanently suppresses all future prompts
 *
 * Usage:
 *   ReviewGate.recordSession(context)  // call once per Activity.onCreate
 *   ReviewGate.shouldShowPrompt(context, "event_name")
 *   ReviewGate.recordAction(context, ReviewAction.SHOWN)
 */
object ReviewGate {

    private val TAG = "ReviewGate"

    // ── DataStore keys ────────────────────────────────────────────────────────
    private val KEY_LAUNCH_COUNT      = intPreferencesKey("launch_count")
    private val KEY_FIRST_LAUNCH_DAY  = longPreferencesKey("first_launch_day")   // epoch-day
    private val KEY_LAST_SHOWN_AT     = longPreferencesKey("last_shown_at")       // epoch-ms
    private val KEY_LAST_SHOWN_DAY    = longPreferencesKey("last_shown_day")      // epoch-day
    private val KEY_DEFERRED_UNTIL    = longPreferencesKey("deferred_until")      // epoch-ms
    private val KEY_NEVER_ASK_AGAIN   = booleanPreferencesKey("never_ask_again")
    private val KEY_ATTEMPTED_AT      = longPreferencesKey("attempted_at")        // epoch-ms
    private val KEY_DISTINCT_DAYS     = intPreferencesKey("distinct_days")        // count of unique usage days
    private val KEY_LAST_USAGE_DAY    = longPreferencesKey("last_usage_day")      // epoch-day

    // ── Constants ─────────────────────────────────────────────────────────────
    private val COOLDOWN_AFTER_SHOWN_MS   = TimeUnit.DAYS.toMillis(90)
    private val DEFER_LATER_MS            = TimeUnit.DAYS.toMillis(7)
    private val MIN_SESSIONS              = 2
    private val MIN_DISTINCT_DAYS         = 2

    /**
     * Call once per Activity launch (e.g., in HomeActivity.onCreate).
     * Increments the launch counter and tracks distinct calendar days.
     */
    suspend fun recordSession(context: Context) {
        context.reviewDataStore.edit { prefs ->
            val currentDay = epochDay()
            val lastUsageDay = prefs[KEY_LAST_USAGE_DAY] ?: -1L

            // Increment launch count
            val count = (prefs[KEY_LAUNCH_COUNT] ?: 0) + 1
            prefs[KEY_LAUNCH_COUNT] = count

            // Set first launch day on first ever session
            if (prefs[KEY_FIRST_LAUNCH_DAY] == null) {
                prefs[KEY_FIRST_LAUNCH_DAY] = currentDay
            }

            // Increment distinct-day counter only if this is a new calendar day
            if (currentDay != lastUsageDay) {
                val days = (prefs[KEY_DISTINCT_DAYS] ?: 0) + 1
                prefs[KEY_DISTINCT_DAYS] = days
                prefs[KEY_LAST_USAGE_DAY] = currentDay
            }

            Log.d(TAG, "Session recorded — launches=$count, distinctDays=${prefs[KEY_DISTINCT_DAYS]}")
        }
    }

    /**
     * Returns true if the review prompt should be shown for the given event.
     *
     * @param context Application or Activity context.
     * @param eventName Descriptive event name for logs (e.g., "completed_first_chat").
     */
    suspend fun shouldShowPrompt(context: Context, eventName: String): Boolean {
        val prefs = context.reviewDataStore.data.first()
        val now   = System.currentTimeMillis()
        val today = epochDay()

        val neverAsk       = prefs[KEY_NEVER_ASK_AGAIN] ?: false
        val deferredUntil  = prefs[KEY_DEFERRED_UNTIL]  ?: 0L
        val lastShownAt    = prefs[KEY_LAST_SHOWN_AT]   ?: 0L
        val lastAttempted  = prefs[KEY_ATTEMPTED_AT]    ?: 0L
        val lastShownDay   = prefs[KEY_LAST_SHOWN_DAY]  ?: -1L
        val launchCount    = prefs[KEY_LAUNCH_COUNT]    ?: 0
        val distinctDays   = prefs[KEY_DISTINCT_DAYS]   ?: 0

        // Gate 1 — user opted out permanently
        if (neverAsk) {
            Log.d(TAG, "[$eventName] Blocked: neverAskAgain=true")
            return false
        }

        // Gate 2 — user deferred, still within deferral window
        if (now < deferredUntil) {
            val remainDays = TimeUnit.MILLISECONDS.toDays(deferredUntil - now)
            Log.d(TAG, "[$eventName] Blocked: deferred for ${remainDays}d more")
            return false
        }

        // Gate 3 — not enough engagement (sessions or distinct days)
        if (launchCount < MIN_SESSIONS && distinctDays < MIN_DISTINCT_DAYS) {
            Log.d(TAG, "[$eventName] Blocked: launches=$launchCount, distinctDays=$distinctDays — not enough engagement")
            return false
        }

        // Gate 4 — cooldown after last shown or attempted (whichever is more recent)
        val mostRecentActivity = maxOf(lastShownAt, lastAttempted)
        if (mostRecentActivity > 0 && now - mostRecentActivity < COOLDOWN_AFTER_SHOWN_MS) {
            val remainDays = TimeUnit.MILLISECONDS.toDays(COOLDOWN_AFTER_SHOWN_MS - (now - mostRecentActivity))
            Log.d(TAG, "[$eventName] Blocked: 90-day cooldown, ${remainDays}d remaining")
            return false
        }

        // Gate 5 — already shown today
        if (lastShownDay == today) {
            Log.d(TAG, "[$eventName] Blocked: already shown today")
            return false
        }

        Log.d(TAG, "[$eventName] ✅ Gate passed — showing review prompt")
        return true
    }

    /**
     * Record a user action or system event. Should be called whenever user
     * interacts with the BottomSheet or when a review flow is attempted.
     */
    suspend fun recordAction(context: Context, action: ReviewAction) {
        val now = System.currentTimeMillis()
        context.reviewDataStore.edit { prefs ->
            when (action) {
                ReviewAction.SHOWN -> {
                    prefs[KEY_LAST_SHOWN_AT]  = now
                    prefs[KEY_LAST_SHOWN_DAY] = epochDay()
                    Log.d(TAG, "Action: SHOWN recorded")
                }
                ReviewAction.RATE_NOW -> {
                    // Treated same as SHOWN for cooldown purposes —
                    // the attemptedAt timestamp will be set separately
                    prefs[KEY_LAST_SHOWN_AT]  = now
                    prefs[KEY_LAST_SHOWN_DAY] = epochDay()
                    Log.d(TAG, "Action: RATE_NOW recorded")
                }
                ReviewAction.ATTEMPTED -> {
                    // Store attempt time immediately; this is called BEFORE
                    // launchReviewFlow so quota/eligibility can't skip it.
                    prefs[KEY_ATTEMPTED_AT] = now
                    Log.d(TAG, "Action: ATTEMPTED recorded at $now")
                }
                ReviewAction.LATER -> {
                    prefs[KEY_DEFERRED_UNTIL] = now + DEFER_LATER_MS
                    Log.d(TAG, "Action: LATER recorded — deferred for 7 days")
                }
                ReviewAction.NEVER -> {
                    prefs[KEY_NEVER_ASK_AGAIN] = true
                    Log.d(TAG, "Action: NEVER recorded — permanently disabled")
                }
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Returns the current calendar day as an integer (days since epoch). */
    private fun epochDay(): Long {
        val cal = Calendar.getInstance()
        val year  = cal.get(Calendar.YEAR)
        val month = cal.get(Calendar.MONTH)
        val day   = cal.get(Calendar.DAY_OF_MONTH)
        // Simple stable epoch-day calculation
        return (year * 365L) + (month * 31L) + day
    }
}
