package com.smc2.grasshopperbooking

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.smc2.grasshopperbooking.ui.navigation.AppNavigation
import com.smc2.grasshopperbooking.ui.theme.GrasshopperBookingTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            GrasshopperBookingTheme {
                AppNavigation()
            }
        }
    }
}
