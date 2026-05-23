package com.smc2.grasshopperbooking.model

import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID

data class Booking(
    val id: String = UUID.randomUUID().toString(),
    val offerId: String,
    val fullName: String,
    val email: String,
    val phone: String,
    val company: String,
    val date: LocalDate,
    val time: LocalTime,
    val notes: String,
    val createdAt: Long = System.currentTimeMillis()
) {
    val offer: Offer? get() = OfferCatalog.byId(offerId)
}
