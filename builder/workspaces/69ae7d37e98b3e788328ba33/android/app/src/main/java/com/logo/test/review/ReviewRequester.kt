package com.logo.test.review

import android.app.Activity
import android.util.Log
import com.google.android.play.core.review.ReviewManagerFactory
import com.google.android.play.core.review.ReviewInfo
import kotlinx.coroutines.tasks.await

/**
 * ReviewRequester — wraps the Google Play In-App Review API.
 *
 * Calls are silently swallowed on any error so a quota/eligibility failure
 * never surfaces an exception to the caller.
 *
 * IMPORTANT: [ReviewGate.recordAction(ATTEMPTED)] must be called *before*
 * this function is invoked (handled by ReviewBottomSheet).
 */
object ReviewRequester {

    private const val TAG = "ReviewRequester"

    /**
     * Requests a ReviewInfo object and, if successful, launches the in-app
     * review flow. Must be called from a coroutine on the Main dispatcher.
     *
     * Google may silently decline to show the review dialog due to quotas or
     * eligibility rules. This is expected behaviour and we fail silently.
     *
     * @param activity The foreground Activity needed for launchReviewFlow.
     */
    suspend fun requestAndLaunch(activity: Activity) {
        try {
            val manager = ReviewManagerFactory.create(activity)

            // Step 1: request a ReviewInfo token (suspends; may take a moment)
            Log.d(TAG, "Requesting review flow token...")
            val reviewInfo: ReviewInfo = manager.requestReviewFlow().await()
            Log.d(TAG, "ReviewInfo obtained — launching review flow")

            // Step 2: launch the in-app review overlay
            // Note: Google controls whether the native dialog actually appears.
            // launchReviewFlow() completes immediately even if no UI is shown.
            manager.launchReviewFlow(activity, reviewInfo).await()
            Log.d(TAG, "Review flow completed (UI may or may not have appeared)")

        } catch (e: Exception) {
            // Expected in development builds, emulators, or when Google's quota
            // is exhausted. Fail silently — do not crash or alert the user.
            Log.w(TAG, "In-app review flow failed (silent): ${e.message}")
        }
    }
}
