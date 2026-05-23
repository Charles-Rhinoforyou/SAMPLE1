package com.smc2.grasshopperbooking.data

import com.smc2.grasshopperbooking.model.Booking
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object BookingsRepository {
    private val _bookings = MutableStateFlow<List<Booking>>(emptyList())
    val bookings: StateFlow<List<Booking>> = _bookings.asStateFlow()

    fun add(booking: Booking) {
        _bookings.value = _bookings.value + booking
    }

    fun remove(id: String) {
        _bookings.value = _bookings.value.filterNot { it.id == id }
    }
}
