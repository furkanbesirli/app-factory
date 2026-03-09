package com.deneme.test.review

import android.app.Dialog
import android.content.DialogInterface
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.lifecycle.lifecycleScope
import com.deneme.test.R
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * ReviewBottomSheet — A polite, non-intrusive in-app review prompt.
 *
 * Displays three actions:
 *  "Rate now"        → records RATE_NOW, records ATTEMPTED, launches Play Review flow.
 *  "Maybe later"     → records LATER, dismisses (gate defers for 7 days).
 *  "Don't ask again" → records NEVER, dismisses (gate disabled permanently).
 *
 * Always call [ReviewGate.recordAction(SHOWN)] *before* showing this fragment so
 * the cooldown timer starts even if the user force-closes the sheet.
 *
 * Example usage (from an Activity):
 *   ReviewBottomSheet.show(supportFragmentManager)
 */
class ReviewBottomSheet : BottomSheetDialogFragment() {

    companion object {
        private const val TAG = "ReviewBottomSheet"
        private const val FRAGMENT_TAG = "review_prompt"

        /**
         * Convenience factory — records SHOWN, then displays the BottomSheet.
         * Safe to call on the Main thread; DataStore write runs on IO.
         */
        fun show(
            activity: androidx.fragment.app.FragmentActivity
        ) {
            if (activity.isFinishing || activity.isDestroyed) {
                Log.w(TAG, "Activity is finishing/destroyed — skipping show()")
                return
            }
            // Record SHOWN before displaying so the cooldown covers this attempt
            activity.lifecycleScope.launch(Dispatchers.IO) {
                ReviewGate.recordAction(activity.applicationContext, ReviewAction.SHOWN)
            }
            ReviewBottomSheet()
                .show(activity.supportFragmentManager, FRAGMENT_TAG)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_review_bottomsheet, container, false)

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val dialog = super.onCreateDialog(savedInstanceState) as BottomSheetDialog
        // Expand fully on open — no half-state peeking
        dialog.setOnShowListener {
            val sheet = dialog.findViewById<View>(com.google.android.material.R.id.design_bottom_sheet)
            sheet?.let {
                val behavior = BottomSheetBehavior.from(it)
                behavior.state = BottomSheetBehavior.STATE_EXPANDED
                behavior.skipCollapsed = true
            }
        }
        return dialog
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val btnRateNow = view.findViewById<MaterialButton>(R.id.btnRateNow)
        val btnLater   = view.findViewById<MaterialButton>(R.id.btnLater)
        val btnNever   = view.findViewById<MaterialButton>(R.id.btnNever)

        btnRateNow.setOnClickListener {
            Log.d(TAG, "User tapped: Rate now")
            val ctx = requireContext().applicationContext
            lifecycleScope.launch {
                // 1. Record RATE_NOW (also resets the shown-day gate)
                ReviewGate.recordAction(ctx, ReviewAction.RATE_NOW)
                // 2. Record ATTEMPTED *before* launching — even if Google doesn't
                //    show its UI, the 90-day cooldown starts now.
                ReviewGate.recordAction(ctx, ReviewAction.ATTEMPTED)
                // 3. Launch Play Core review flow (fail-silent)
                val act = activity
                if (act != null && !act.isFinishing) {
                    ReviewRequester.requestAndLaunch(act)
                }
            }
            dismissAllowingStateLoss()
        }

        btnLater.setOnClickListener {
            Log.d(TAG, "User tapped: Maybe later")
            recordAndDismiss(ReviewAction.LATER)
        }

        btnNever.setOnClickListener {
            Log.d(TAG, "User tapped: Don't ask again")
            recordAndDismiss(ReviewAction.NEVER)
        }
    }

    private fun recordAndDismiss(action: ReviewAction) {
        val ctx = requireContext().applicationContext
        lifecycleScope.launch(Dispatchers.IO) {
            ReviewGate.recordAction(ctx, action)
        }
        dismissAllowingStateLoss()
    }

    override fun onCancel(dialog: DialogInterface) {
        super.onCancel(dialog)
        // Treat backdrop dismiss the same as "Maybe later"
        Log.d(TAG, "Sheet cancelled — treating as LATER")
        val ctx = context?.applicationContext ?: return
        lifecycleScope.launch(Dispatchers.IO) {
            ReviewGate.recordAction(ctx, ReviewAction.LATER)
        }
    }

    override fun getTheme(): Int = R.style.ReviewBottomSheetTheme
}
