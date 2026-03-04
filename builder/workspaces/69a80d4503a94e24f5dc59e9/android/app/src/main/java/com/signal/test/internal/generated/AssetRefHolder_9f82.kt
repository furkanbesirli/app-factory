package com.signal.test.internal.generated

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.net.Uri

@Suppress("unused")
internal class AssetRefHolder_9f82 : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.assets?.let { assets ->
            try {
                val names = listOf("data_1981ea.dat", "data_e68d20.bin", "data_3b3d77.idx", "data_c98464.bin", "data_47d5e9.cache")
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
