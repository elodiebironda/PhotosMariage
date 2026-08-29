// ========================================
// CHARGEMENT DES INFORMATIONS DU MARIAGE
// ========================================

const bouton = document.getElementById("entrer");

if (bouton) {

    bouton.addEventListener("click", () => {

        const splash = document.getElementById("splash");

        splash.style.opacity = "0";

        setTimeout(() => {
            splash.style.display = "none";
        }, 1000);

    });

}


// ========================================
// IDENTIFICATION DU MARIAGE
// ========================================

const chemin = window.location.pathname;

const idMariage = chemin.split('/')[1] || "elodie-emilie";


// Champ caché pour l'envoi des photos

const champMariage = document.getElementById("idMariage");

if (champMariage) {
    champMariage.value = idMariage;
}


// ========================================
// LIEN VERS LA GALERIE
// ========================================

const lienGalerie = document.getElementById("lienGalerie");

if (lienGalerie) {
    lienGalerie.href = `/${idMariage}/galerie.html`;
}


// ========================================
// RÉCUPÉRATION DU MARIAGE
// ========================================

fetch(`/api/mariage/${idMariage}`)

.then(response => {

    if (!response.ok) {
        throw new Error("Mariage introuvable");
    }

    return response.json();

})

.then(mariage => {

    console.log("Mariage chargé :", mariage);


    // ========================================
    // INFORMATIONS
    // ========================================

    document.getElementById("prenoms").textContent =
        mariage.prenoms;

    document.getElementById("date").textContent =
        mariage.date;

    document.getElementById("lieu").textContent =
        mariage.lieu;

    document.getElementById("mairie").textContent =
        mariage.mairie;

    document.getElementById("message").textContent =
        mariage.message || "Bienvenue";


    // ========================================
    // COULEUR
    // ========================================

    if (mariage.couleur) {

        document.documentElement.style.setProperty(
            "--couleur-principale",
            mariage.couleur
        );

    }


    // ========================================
    // INITIALES
    // ========================================

    const initiales = mariage.prenoms
        .split("&")
        .map(prenom => prenom.trim()[0])
        .join(" & ");

    document.getElementById("initiales").textContent =
        initiales;


    // ========================================
    // SPLASH SCREEN
    // ========================================

    document.getElementById("splashPrenoms").textContent =
        mariage.prenoms;

    document.getElementById("splashDate").textContent =
        mariage.date;


    // ========================================
    // COMPTE À REBOURS
    // ========================================

    function creerDateMariage(dateTexte, heureTexte) {

        if (!dateTexte) {
            return null;
        }


        // ----------------------------------------
        // FORMAT ISO : 2027-06-04
        // ----------------------------------------

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateTexte)) {

            const [annee, mois, jour] =
                dateTexte.split("-").map(Number);


            let heures = 0;
            let minutes = 0;


            if (heureTexte) {

                const morceauxHeure =
                    heureTexte.split(":");

                heures =
                    parseInt(morceauxHeure[0]) || 0;

                minutes =
                    parseInt(morceauxHeure[1]) || 0;

            }


            return new Date(
                annee,
                mois - 1,
                jour,
                heures,
                minutes,
                0
            );

        }


        // ----------------------------------------
        // FORMAT FRANÇAIS : 04 juin 2027
        // ----------------------------------------

        const moisFrancais = {

            janvier: 0,
            février: 1,
            fevrier: 1,
            mars: 2,
            avril: 3,
            mai: 4,
            juin: 5,
            juillet: 6,
            août: 7,
            aout: 7,
            septembre: 8,
            octobre: 9,
            novembre: 10,
            décembre: 11,
            decembre: 11

        };


        const morceaux =
            dateTexte
                .toLowerCase()
                .trim()
                .split(/\s+/);


        if (morceaux.length >= 3) {

            const jour =
                parseInt(morceaux[0]);

            const moisNumero =
                moisFrancais[morceaux[1]];

            const annee =
                parseInt(morceaux[2]);


            if (
                !isNaN(jour) &&
                moisNumero !== undefined &&
                !isNaN(annee)
            ) {

                let heures = 0;
                let minutes = 0;


                if (heureTexte) {

                    const morceauxHeure =
                        heureTexte.split(":");

                    heures =
                        parseInt(morceauxHeure[0]) || 0;

                    minutes =
                        parseInt(morceauxHeure[1]) || 0;

                }


                return new Date(
                    annee,
                    moisNumero,
                    jour,
                    heures,
                    minutes,
                    0
                );

            }

        }


        return null;

    }


    const dateMariage =
        creerDateMariage(
            mariage.date,
            mariage.heure
        );


    console.log(
        "Date du mariage :",
        dateMariage
    );


    // ========================================
    // ACTUALISATION DU COMPTEUR
    // ========================================

    const countdown =
        document.getElementById("countdown");


    if (dateMariage && countdown) {

        function actualiserCompteRebours() {

            const maintenant =
                new Date();


            const difference =
                dateMariage.getTime() -
                maintenant.getTime();


            // ----------------------------------------
            // MARIAGE AUJOURD'HUI OU PASSÉ
            // ----------------------------------------

            if (difference <= 0) {

                countdown.textContent =
                    "C'est aujourd'hui ! ❤️";

                return;

            }


            // ----------------------------------------
            // CALCUL
            // ----------------------------------------

            const jours =
                Math.floor(
                    difference /
                    (1000 * 60 * 60 * 24)
                );


            const heures =
                Math.floor(
                    (difference /
                    (1000 * 60 * 60)) % 24
                );


            const minutes =
                Math.floor(
                    (difference /
                    (1000 * 60)) % 60
                );


            const secondes =
                Math.floor(
                    (difference /
                    1000) % 60
                );


            // ----------------------------------------
            // AFFICHAGE
            // ----------------------------------------

            countdown.textContent =
                `${jours} jours ${heures}h ${minutes}min ${secondes}s`;

        }


        // Première actualisation

        actualiserCompteRebours();


        // Actualisation toutes les secondes

        setInterval(
            actualiserCompteRebours,
            1000
        );


    } else if (countdown) {

        countdown.textContent =
            "Date du mariage invalide";

    }


})

.catch(error => {

    console.error(
        "Erreur lors du chargement du mariage :",
        error
    );

});


// ========================================
// APERÇU DES PHOTOS
// ========================================

const input =
    document.getElementById("photos");

const preview =
    document.getElementById("preview");


if (input && preview) {

    input.addEventListener(
        "change",
        function() {

            preview.innerHTML = "";


            Array.from(this.files).forEach(file => {

                const image =
                    document.createElement("img");


                image.src =
                    URL.createObjectURL(file);


                image.style.width =
                    "120px";

                image.style.margin =
                    "10px";

                image.style.borderRadius =
                    "15px";


                preview.appendChild(image);

            });

        }
    );

}


// ========================================
// GÉNÉRATION DES PÉTALES
// ========================================

const fleurs = [
    "🌸",
    "🌿",
    "🌺"
];


for (let i = 0; i < 20; i++) {

    const petale =
        document.createElement("div");


    petale.className =
        "petale";


    petale.textContent =
        fleurs[
            Math.floor(
                Math.random() *
                fleurs.length
            )
        ];


    petale.style.left =
        Math.random() * 100 + "%";


    petale.style.fontSize =
        (20 + Math.random() * 20) + "px";


    petale.style.animationDuration =
        (6 + Math.random() * 8) + "s";


    petale.style.animationDelay =
        Math.random() * 8 + "s";


    document.body.appendChild(petale);

}