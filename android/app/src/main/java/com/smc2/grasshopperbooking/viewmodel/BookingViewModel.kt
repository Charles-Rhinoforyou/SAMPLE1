package com.smc2.grasshopperbooking.viewmodel

import androidx.lifecycle.ViewModel
import com.smc2.grasshopperbooking.data.BookingsRepository
import com.smc2.grasshopperbooking.model.Booking
import com.smc2.grasshopperbooking.model.OfferCatalog
import com.smc2.grasshopperbooking.model.OfferType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime

data class BookingFormState(
    val offerId: String = "",
    val fullName: String = "",
    val email: String = "",
    val phone: String = "",
    val company: String = "",
    val date: LocalDate = LocalDate.now().plusDays(1),
    val time: LocalTime = LocalTime.of(9, 0),
    val notes: String = "",
    val submitted: Boolean = false,
    val lastError: String? = null
) {
    val isValid: Boolean
        get() = fullName.isNotBlank() &&
            email.contains("@") && email.contains(".") &&
            phone.length >= 6 &&
            offerId.isNotBlank()
}

class BookingViewModel : ViewModel() {
    private val _form = MutableStateFlow(BookingFormState())
    val form: StateFlow<BookingFormState> = _form.asStateFlow()

    val bookings = BookingsRepository.bookings

    fun startBooking(offerId: String) {
        val offer = OfferCatalog.byId(offerId)
        val defaultDate = if (offer?.type == OfferType.SATURDAY_WORKSHOP) {
            nextSaturday()
        } else {
            LocalDate.now().plusDays(1)
        }
        val defaultTime = if (offer?.type == OfferType.SATURDAY_WORKSHOP) {
            LocalTime.of(9, 0)
        } else {
            LocalTime.of(9, 0)
        }
        _form.value = BookingFormState(
            offerId = offerId,
            date = defaultDate,
            time = defaultTime
        )
    }

    fun updateName(v: String) { _form.value = _form.value.copy(fullName = v) }
    fun updateEmail(v: String) { _form.value = _form.value.copy(email = v) }
    fun updatePhone(v: String) { _form.value = _form.value.copy(phone = v) }
    fun updateCompany(v: String) { _form.value = _form.value.copy(company = v) }
    fun updateDate(d: LocalDate) { _form.value = _form.value.copy(date = d, lastError = null) }
    fun updateTime(t: LocalTime) { _form.value = _form.value.copy(time = t) }
    fun updateNotes(v: String) { _form.value = _form.value.copy(notes = v) }

    fun submit(): Boolean {
        val s = _form.value
        if (!s.isValid) {
            _form.value = s.copy(lastError = "Merci de compléter les champs obligatoires.")
            return false
        }
        val offer = OfferCatalog.byId(s.offerId)
        if (offer?.type == OfferType.SATURDAY_WORKSHOP && s.date.dayOfWeek != DayOfWeek.SATURDAY) {
            _form.value = s.copy(lastError = "Cette formule a lieu uniquement le samedi.")
            return false
        }
        BookingsRepository.add(
            Booking(
                offerId = s.offerId,
                fullName = s.fullName.trim(),
                email = s.email.trim(),
                phone = s.phone.trim(),
                company = s.company.trim(),
                date = s.date,
                time = s.time,
                notes = s.notes.trim()
            )
        )
        _form.value = s.copy(submitted = true, lastError = null)
        return true
    }

    fun cancel(id: String) = BookingsRepository.remove(id)

    private fun nextSaturday(): LocalDate {
        var d = LocalDate.now()
        while (d.dayOfWeek != DayOfWeek.SATURDAY) d = d.plusDays(1)
        return d
    }
}
