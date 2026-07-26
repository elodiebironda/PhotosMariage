
const form = document.getElementById("mariageForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const donnees = Object.fromEntries(
        new FormData(form)
    );

    const response = await fetch("/api/admin/mariage", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(donnees)
    });

    const resultat = await response.json();

    alert(
    resultat.message +
    "\n\nLien invité : " +
    window.location.origin +
    resultat.lien
);

});