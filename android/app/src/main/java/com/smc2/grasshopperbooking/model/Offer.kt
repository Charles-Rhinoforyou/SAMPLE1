package com.smc2.grasshopperbooking.model

enum class OfferType { HOURLY, PACK_10H, PACK_30H, SATURDAY_WORKSHOP }

data class Offer(
    val id: String,
    val type: OfferType,
    val title: String,
    val subtitle: String,
    val priceEuros: Int,
    val hours: Int,
    val description: String,
    val highlights: List<String>
)

object OfferCatalog {
    val all: List<Offer> = listOf(
        Offer(
            id = "hourly",
            type = OfferType.HOURLY,
            title = "Séance d'une heure",
            subtitle = "Développement Grasshopper à l'unité",
            priceEuros = 95,
            hours = 1,
            description = "Une heure de développement Grasshopper en visio ou sur site, idéale pour débloquer un cas précis, prototyper une définition ou auditer un script existant.",
            highlights = listOf(
                "Visio ou sur site",
                "Définition livrée à la fin de la séance",
                "Facturation à l'heure entamée"
            )
        ),
        Offer(
            id = "pack10",
            type = OfferType.PACK_10H,
            title = "Pack 10 heures",
            subtitle = "Crédit de développement",
            priceEuros = 850,
            hours = 10,
            description = "Dix heures de développement Grasshopper à consommer sur 3 mois. Idéal pour suivre un projet sur plusieurs itérations sans relancer à chaque fois.",
            highlights = listOf(
                "Tarif réduit (-10%)",
                "Valable 3 mois",
                "Suivi par projet"
            )
        ),
        Offer(
            id = "pack30",
            type = OfferType.PACK_30H,
            title = "Pack 30 heures",
            subtitle = "Accompagnement long",
            priceEuros = 2280,
            hours = 30,
            description = "Trente heures pour cadrer une chaîne paramétrique complète : extraction Rhino → Grasshopper → livrables. Suivi régulier, point hebdo si besoin.",
            highlights = listOf(
                "Tarif réduit (-20%)",
                "Valable 6 mois",
                "Point hebdo inclus"
            )
        ),
        Offer(
            id = "saturday",
            type = OfferType.SATURDAY_WORKSHOP,
            title = "Samedi formation + rando",
            subtitle = "Une journée, deux ambiances",
            priceEuros = 180,
            hours = 4,
            description = "Le samedi : demi-journée de formation Grasshopper (matin), randonnée et déjeuner partagé l'après-midi. Convivial, en petit groupe.",
            highlights = listOf(
                "Matin : formation Grasshopper",
                "Midi : déjeuner partagé tiré du sac",
                "Après-midi : randonnée encadrée",
                "Groupes de 4 à 8 personnes"
            )
        )
    )

    fun byId(id: String): Offer? = all.firstOrNull { it.id == id }
}
