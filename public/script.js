// Chargement des informations du mariage

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

const chemin = window.location.pathname;

const idMariage = chemin.split('/')[1] || "elodie-emilie";

const champMariage = document.getElementById("idMariage");

if (champMariage) {
    champMariage.value = idMariage;
}

// Lien vers la galerie 
const lienGalerie = document.getElementById("lienGalerie");
if (lienGalerie){
    lienGalerie.href = `/${idMariage}/galerie.html`;
}


fetch(`/api/mariage/${idMariage}`)
.then(response => response.json())

.then(mariage => {

    document.getElementById("prenoms").textContent = mariage.prenoms;

    document.getElementById("date").textContent = mariage.date;

});


// Aperçu des photos avant envoi

const input = document.getElementById("photos");

const preview = document.getElementById("preview");


input.addEventListener("change", function(){


    preview.innerHTML="";


    Array.from(this.files).forEach(file => {


        const image = document.createElement("img");


        image.src = URL.createObjectURL(file);


        image.style.width="120px";

        image.style.margin="10px";

        image.style.borderRadius="15px";


        preview.appendChild(image);


    });


});
// Génération des pétales

const fleurs = ["🌸", "🌿", "🌺"];

for (let i = 0; i < 20; i++) {

    const petale = document.createElement("div");

    petale.className = "petale";

    petale.textContent =
        fleurs[Math.floor(Math.random() * fleurs.length)];

    petale.style.left = Math.random() * 100 + "%";

    petale.style.fontSize =
        (20 + Math.random() * 20) + "px";

    petale.style.animationDuration =
        (6 + Math.random() * 8) + "s";

    petale.style.animationDelay =
        Math.random() * 8 + "s";

    document.body.appendChild(petale);

}