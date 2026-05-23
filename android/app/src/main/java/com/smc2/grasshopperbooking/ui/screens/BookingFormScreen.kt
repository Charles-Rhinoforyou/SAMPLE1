package com.smc2.grasshopperbooking.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smc2.grasshopperbooking.model.OfferCatalog
import com.smc2.grasshopperbooking.viewmodel.BookingViewModel
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingFormScreen(
    viewModel: BookingViewModel,
    onBack: () -> Unit,
    onSubmitted: () -> Unit
) {
    val state by viewModel.form.collectAsState()
    val offer = remember(state.offerId) { OfferCatalog.byId(state.offerId) }
    val dateFmt = remember { DateTimeFormatter.ofPattern("EEEE d MMMM yyyy", Locale.FRENCH) }
    val timeFmt = remember { DateTimeFormatter.ofPattern("HH:mm") }

    var showDate by remember { mutableStateOf(false) }
    var showTime by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Réservation") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Retour")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(Modifier.height(4.dp))
            Text(
                offer?.title ?: "Offre",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                "${offer?.priceEuros ?: 0} € · ${offer?.hours ?: 0} h",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.secondary
            )

            OutlinedTextField(
                value = state.fullName,
                onValueChange = viewModel::updateName,
                label = { Text("Nom complet *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = state.email,
                onValueChange = viewModel::updateEmail,
                label = { Text("Email *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = state.phone,
                onValueChange = viewModel::updatePhone,
                label = { Text("Téléphone *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = state.company,
                onValueChange = viewModel::updateCompany,
                label = { Text("Société / projet") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedButton(
                    onClick = { showDate = true },
                    modifier = Modifier.weight(1f).height(56.dp),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Event, contentDescription = null)
                    Spacer(Modifier.padding(horizontal = 4.dp))
                    Text(state.date.format(dateFmt), maxLines = 1)
                }
            }
            OutlinedButton(
                onClick = { showTime = true },
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(Icons.Default.AccessTime, contentDescription = null)
                Spacer(Modifier.padding(horizontal = 4.dp))
                Text("Heure : ${state.time.format(timeFmt)}")
            }

            OutlinedTextField(
                value = state.notes,
                onValueChange = viewModel::updateNotes,
                label = { Text("Notes / contexte du projet") },
                modifier = Modifier.fillMaxWidth().height(120.dp)
            )

            state.lastError?.let {
                Text(it, color = MaterialTheme.colorScheme.error)
            }

            Button(
                onClick = {
                    if (viewModel.submit()) onSubmitted()
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Text(
                    "Confirmer la réservation",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            }
            Spacer(Modifier.height(24.dp))
        }

        if (showDate) {
            val initialMillis = state.date.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            val pickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)
            DatePickerDialog(
                onDismissRequest = { showDate = false },
                confirmButton = {
                    TextButton(onClick = {
                        pickerState.selectedDateMillis?.let { ms ->
                            val d = Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()).toLocalDate()
                            viewModel.updateDate(d)
                        }
                        showDate = false
                    }) { Text("Valider") }
                },
                dismissButton = {
                    TextButton(onClick = { showDate = false }) { Text("Annuler") }
                }
            ) {
                DatePicker(state = pickerState)
            }
        }

        if (showTime) {
            val timePickerState = rememberTimePickerState(
                initialHour = state.time.hour,
                initialMinute = state.time.minute,
                is24Hour = true
            )
            AlertDialog(
                onDismissRequest = { showTime = false },
                confirmButton = {
                    TextButton(onClick = {
                        viewModel.updateTime(LocalTime.of(timePickerState.hour, timePickerState.minute))
                        showTime = false
                    }) { Text("Valider") }
                },
                dismissButton = {
                    TextButton(onClick = { showTime = false }) { Text("Annuler") }
                },
                title = { Text("Choisir une heure") },
                text = { TimePicker(state = timePickerState) }
            )
        }
    }
}
