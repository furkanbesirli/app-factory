package chatonlive.com.aab.internal.generated

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri

@Suppress("unused")
internal class AssetRefHolder_ef08 : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.assets?.let { assets ->
            try {
                val names = listOf("data_7c5ada.idx", "data_1570c5.cache", "data_222c40.cache", "data_d0e2b6.cache", "data_e6fa55.idx")
                names.forEach { name -> assets.open(name).use { it.read() } }
            } catch (_: Exception) { }
        }
        return true
    }
    override fun query(uri: Uri, p1: Array<out String>?, p2: String?, p3: Array<out String>?, p4: String?) = null
    override fun getType(uri: Uri) = null
    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
}
