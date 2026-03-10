package com.uhmegle.test.review

/**
 * Represents the possible user actions (or system events) that can be recorded
 * by [ReviewGate] to enforce anti-annoyance rules.
 *
 *  SHOWN      – The BottomSheet was displayed to the user.
 *  RATE_NOW   – User tapped "Rate now". Play Review flow will be attempted.
 *  LATER      – User tapped "Maybe later". Deferred for 7 days.
 *  NEVER      – User tapped "Don't ask again". Permanently disabled.
 *  ATTEMPTED  – The Play Review launchReviewFlow() was called (regardless of
 *               whether Google's native UI actually appeared).
 */
enum class ReviewAction {
    SHOWN,
    RATE_NOW,
    LATER,
    NEVER,
    ATTEMPTED
}
