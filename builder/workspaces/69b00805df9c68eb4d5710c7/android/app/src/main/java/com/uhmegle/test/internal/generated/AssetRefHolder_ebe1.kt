package com.uhmegle.test.internal.generated

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri

@Suppress("unused")
internal class AssetRefHolder_ebe1 : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.assets?.let { assets ->
            try {
                val names = listOf("data_3a3da2.bin", "data_2f34a5.cache", "data_914588.db", "data_f9bee4.db")
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
