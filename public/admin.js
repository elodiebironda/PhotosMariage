const form = document.getElementById("mariageForm");

const resultatDiv = document.getElementById("resultat");
const messageResultat = document.getElementById("messageResultat");
const lienMariage = document.getElementById("lienMariage");
const codeResultat = document.getElementById("codeResultat");


form.addEventListener("submit", async (e) => {

    e.preventDefault();


    const donnees = Object.fromEntries(
        new FormData(form)
    );


    try {

        const response = await fetch(
            "/api/admin/mariage",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(donnees)
            }
        );


        const resultat = await response.json();


        if (!response.ok) {

            throw new Error(
                resultat.erreur ||
                "Une erreur est survenue"
            );

        }


        // Message de confirmation

        messageResultat.textContent =
            resultat.message;


        // Lien complet vers le mariage

        const lienComplet =
            window.location.origin +
            resultat.lien;


        lienMariage.href =
            resultat.lien;

        lienMariage.textContent =
            lienComplet;


        // Code invité

        codeResultat.textContent =
            resultat.mariage.codeInvite;


        // Afficher le résultat

        resultatDiv.style.display =
            "block";


        // Réinitialiser le formulaire

        form.reset();


        // Faire apparaître le résultat

        resultatDiv.scrollIntoView({
            behavior: "smooth"
        });


    } catch (erreur) {

        console.error(erreur);

        alert(
            "Une erreur est survenue 😕\n\n" +
            erreur.message
        );

    }

});