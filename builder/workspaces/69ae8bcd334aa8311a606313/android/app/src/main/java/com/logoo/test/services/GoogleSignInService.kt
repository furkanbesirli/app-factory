package com.logoo.test.services

import android.content.Context
import android.content.SharedPreferences
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class GoogleSignInResult(
    val success: Boolean,
    val user: GoogleSignInAccount? = null,
    val error: String? = null
)

class GoogleSignInService(private val context: Context) {
    private val GOOGLE_WEB_CLIENT_ID = "938594893109-lgrtkd30v4dou48h682tgfgcm2qt0b0l.apps.googleusercontent.com"
    
    private val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken(GOOGLE_WEB_CLIENT_ID)
        .requestEmail()
        .requestProfile()
        .build()
    
    val signInClient: GoogleSignInClient = GoogleSignIn.getClient(context, gso)
    
    suspend fun signIn(): GoogleSignInResult {
        return try {
            val account = signInClient.signInIntent
            // This will be handled by Activity result
            GoogleSignInResult(success = false, error = "Use signInIntent")
        } catch (e: Exception) {
            GoogleSignInResult(success = false, error = e.message)
        }
    }
    
    suspend fun handleSignInResult(data: android.content.Intent?): GoogleSignInResult {
        return try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            GoogleSignInResult(success = true, user = account)
        } catch (e: ApiException) {
            val errorMessage = when (e.statusCode) {
                10 -> "Sign in cancelled"
                7 -> "Network error"
                8 -> "Internal error"
                else -> "Sign in failed: ${e.message}"
            }
            GoogleSignInResult(success = false, error = errorMessage)
        } catch (e: Exception) {
            GoogleSignInResult(success = false, error = e.message)
        }
    }
    
    suspend fun isSignedIn(): Boolean {
        return try {
            val account = GoogleSignIn.getLastSignedInAccount(context)
            account != null
        } catch (e: Exception) {
            false
        }
    }
    
    suspend fun getCurrentUser(): GoogleSignInAccount? {
        return try {
            GoogleSignIn.getLastSignedInAccount(context)
        } catch (e: Exception) {
            null
        }
    }
    
    suspend fun signOut() {
        try {
            withContext(Dispatchers.IO) {
                Tasks.await(signInClient.signOut())
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

