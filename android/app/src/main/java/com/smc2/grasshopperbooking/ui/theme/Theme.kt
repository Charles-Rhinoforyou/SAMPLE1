package com.smc2.grasshopperbooking.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = GrasshopperDark,
    onPrimary = Color.White,
    primaryContainer = GrasshopperLight,
    onPrimaryContainer = GrasshopperDark,
    secondary = LeafAccent,
    onSecondary = Color.White,
    tertiary = GrasshopperGreen,
    background = SurfaceCream,
    onBackground = GrasshopperDark,
    surface = Color.White,
    onSurface = GrasshopperDark
)

private val DarkColors = darkColorScheme(
    primary = GrasshopperGreen,
    onPrimary = Color.Black,
    primaryContainer = GrasshopperDark,
    onPrimaryContainer = GrasshopperLight,
    secondary = LeafAccent,
    tertiary = GrasshopperLight
)

@Composable
fun GrasshopperBookingTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = AppTypography,
        content = content
    )
}
