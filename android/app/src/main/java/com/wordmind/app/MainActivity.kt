package com.wordmind.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.wordmind.app.data.WordMindApi
import com.wordmind.app.ui.WordMindApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val api = WordMindApi(applicationContext)
        setContent {
            WordMindApp(api)
        }
    }
}
