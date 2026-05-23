package com.smc2.grasshopperbooking.ui.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smc2.grasshopperbooking.ui.screens.BookingFormScreen
import com.smc2.grasshopperbooking.ui.screens.BookingsListScreen
import com.smc2.grasshopperbooking.ui.screens.ConfirmationScreen
import com.smc2.grasshopperbooking.ui.screens.OfferDetailScreen
import com.smc2.grasshopperbooking.ui.screens.OffersScreen
import com.smc2.grasshopperbooking.viewmodel.BookingViewModel

object Routes {
    const val OFFERS = "offers"
    const val OFFER_DETAIL = "offer/{offerId}"
    const val BOOKING_FORM = "book/{offerId}"
    const val CONFIRMATION = "confirmation"
    const val BOOKINGS = "bookings"

    fun offerDetail(id: String) = "offer/$id"
    fun bookingForm(id: String) = "book/$id"
}

@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val viewModel: BookingViewModel = viewModel()

    NavHost(navController = nav, startDestination = Routes.OFFERS) {
        composable(Routes.OFFERS) {
            OffersScreen(
                onOfferClick = { nav.navigate(Routes.offerDetail(it.id)) },
                onSeeBookings = { nav.navigate(Routes.BOOKINGS) }
            )
        }
        composable(
            route = Routes.OFFER_DETAIL,
            arguments = listOf(navArgument("offerId") { type = NavType.StringType })
        ) { entry ->
            val id = entry.arguments?.getString("offerId").orEmpty()
            OfferDetailScreen(
                offerId = id,
                onBack = { nav.popBackStack() },
                onBook = {
                    viewModel.startBooking(id)
                    nav.navigate(Routes.bookingForm(id))
                }
            )
        }
        composable(
            route = Routes.BOOKING_FORM,
            arguments = listOf(navArgument("offerId") { type = NavType.StringType })
        ) {
            BookingFormScreen(
                viewModel = viewModel,
                onBack = { nav.popBackStack() },
                onSubmitted = {
                    nav.navigate(Routes.CONFIRMATION) {
                        popUpTo(Routes.OFFERS)
                    }
                }
            )
        }
        composable(Routes.CONFIRMATION) {
            ConfirmationScreen(
                viewModel = viewModel,
                onHome = {
                    nav.navigate(Routes.OFFERS) {
                        popUpTo(Routes.OFFERS) { inclusive = true }
                    }
                },
                onSeeBookings = {
                    nav.navigate(Routes.BOOKINGS) {
                        popUpTo(Routes.OFFERS)
                    }
                }
            )
        }
        composable(Routes.BOOKINGS) {
            BookingsListScreen(
                viewModel = viewModel,
                onBack = { nav.popBackStack() }
            )
        }
    }
}
