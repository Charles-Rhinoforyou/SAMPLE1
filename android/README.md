# Grasshopper Booking — application Android

Application Android native (Kotlin + Jetpack Compose, Material 3) permettant de
réserver des prestations de développement Grasshopper.

## Offres proposées

| Formule | Durée | Tarif |
| --- | --- | --- |
| Séance d'une heure | 1 h | 95 € |
| Pack 10 heures | 10 h | 850 € |
| Pack 30 heures | 30 h | 2 280 € |
| Samedi formation + randonnée + déjeuner | journée (4 h formation) | 180 € |

Toutes les valeurs (titres, tarifs, descriptions) sont définies dans
`app/src/main/java/com/smc2/grasshopperbooking/model/Offer.kt` et peuvent être
ajustées au besoin.

## Architecture

- `model/` : `Offer` (catalogue statique) et `Booking` (réservation utilisateur).
- `data/BookingsRepository.kt` : stockage en mémoire des réservations
  (`StateFlow<List<Booking>>`). À remplacer par Room/DataStore ou un backend
  pour la persistance.
- `viewmodel/BookingViewModel.kt` : état du formulaire et soumission.
- `ui/screens/` : écrans Compose (catalogue, détail offre, formulaire,
  confirmation, liste des réservations).
- `ui/navigation/AppNavigation.kt` : graphe de navigation Compose.

## Build

Prérequis : Android Studio Hedgehog (ou plus récent), JDK 17.

```bash
cd android
./gradlew assembleDebug   # nécessite le wrapper Gradle (voir ci-dessous)
```

Le binaire `gradle-wrapper.jar` n'est pas inclus. Pour le générer :

```bash
cd android
gradle wrapper --gradle-version 8.7
```

Ou ouvrez simplement le dossier `android/` dans Android Studio : l'IDE
téléchargera le wrapper automatiquement.

## Pistes d'évolution

- Persistance Room ou DataStore pour conserver les réservations entre sessions.
- Backend (REST / Firebase) pour synchroniser les disponibilités côté
  prestataire.
- Intégration paiement (Stripe, Lydia Pro) sur l'écran de confirmation.
- Envoi d'email de confirmation (Mailjet, SendGrid).
- Calendrier des samedis disponibles (validation côté serveur).
