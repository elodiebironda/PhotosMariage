require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const mariages = require('./config/mariages.json');
const comptes = require('./config/comptes.json');

const app = express();


// ========================================
// CONFIGURATION
// ========================================

const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);


// ========================================
// MIDDLEWARES
// ========================================

app.use(session({
  secret: process.env.SESSION_SECRET || 'photosMariage-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ========================================
// LOG DES REQUÊTES
// ========================================

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});


// ========================================
// FICHIERS PUBLICS
// ========================================

app.use(
  express.static(
    path.join(__dirname, 'public'),
    {
      index: false
    }
  )
);


// ========================================
// CLOUDINARY
// ========================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ========================================
// MIDDLEWARE INVITÉ
// ========================================
function verifierInvite(req, res, next) {
  const mariageId = req.params.mariage || req.params.id;

  const mariage = mariages.find(
    m => m.id === mariageId
  );

  if (!mariage) {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({
        erreur: 'Mariage introuvable'
      });
    }

    return res.status(404).send('Mariage introuvable.');
  }

  req.session.invite = true;
  req.session.mariage = mariage.id;

  return next();
}

// ========================================
// MIDDLEWARE INVITÉ POUR UPLOAD
// ========================================

function verifierInviteUpload(req, res, next) {

  if (
    req.session.invite &&
    req.session.mariage
  ) {
    return next();
  }

  return res.status(401).send(
    'Connexion invité nécessaire.'
  );
}


// ========================================
// MIDDLEWARE ADMIN
// ========================================

function verifierAdmin(req, res, next) {

  if (req.session.admin) {
    return next();
  }

  return res.redirect('/login');
}


// ========================================
// MIDDLEWARE COUPLE
// ========================================

function verifierCouple(req, res, next) {

  if (
    req.session.couple &&
    req.session.compteId
  ) {
    return next();
  }

  return res.redirect('/connexion-couple');
}


// ========================================
// PAGE D'ACCUEIL
// ========================================

app.get('/', (req, res) => {

  res.redirect('/elodie-emilie');

});


// ========================================
// CONNEXION INVITÉ
// ========================================

app.get('/connexion', (req, res) => {

  res.sendFile(
    path.join(__dirname, 'public', 'connexion.html')
  );

});


app.post('/connexion', (req, res) => {

  const codeInvite =
    (req.body.codeInvite || '')
      .trim()
      .toUpperCase();


  console.log(
    'CODE INVITÉ :',
    codeInvite
  );


  const mariage = mariages.find(
    m =>
      (m.codeInvite || '')
        .trim()
        .toUpperCase() === codeInvite
  );


  if (!mariage) {

    return res.send(`
      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <title>Code incorrect</title>

      </head>

      <body style="
        font-family:Arial;
        text-align:center;
        padding:50px;
        background:#F8F5F4;
      ">

        <h1>Code incorrect ❌</h1>

        <p>
          Le code que vous avez indiqué
          n'est pas valide.
        </p>

        <a href="/connexion">
          Réessayer
        </a>

      </body>

      </html>
    `);

  }


  // Connexion à CE mariage uniquement

  req.session.invite = true;
  req.session.mariage = mariage.id;


  return res.redirect(
    `/${mariage.id}`
  );

});


// ========================================
// INFORMATIONS D'UN MARIAGE
// ========================================

app.get(
  '/api/mariage/:id',
  verifierInvite,
  (req, res) => {

    const mariage = mariages.find(
      m => m.id === req.params.id
    );


    if (!mariage) {

      return res.status(404).json({
        erreur: 'Mariage introuvable'
      });

    }


    return res.json(mariage);

  }
);


// ========================================
// PHOTOS D'UN MARIAGE
// ========================================

app.get(
  '/api/mariage/:id/photos',
  verifierInvite,
  async (req, res) => {

    try {

      const mariage = mariages.find(
        m => m.id === req.params.id
      );


      if (!mariage) {

        return res.status(404).json({
          erreur: 'Mariage introuvable'
        });

      }


      const dossier =
        `album-d-un-oui/${mariage.id}`;


      const result =
        await cloudinary.search
          .expression(
            `folder:${dossier}`
          )
          .sort_by(
            'created_at',
            'desc'
          )
          .execute();


      return res.json(
        result.resources
      );

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        erreur: err.message
      });

    }

  }
);


// ========================================
// STOCKAGE CLOUDINARY
// ========================================

const storage =
  new CloudinaryStorage({

    cloudinary: cloudinary,

    params: async (req, file) => {

      /*
       * IMPORTANT :
       * Le dossier est maintenant déterminé
       * par la session du mariage connecté.
       *
       * On ne fait plus confiance à
       * req.body.mariage.
       */

      const mariageId =
        req.session.mariage;


      return {

        folder:
          `album-d-un-oui/${mariageId}`,

        allowed_formats: [
          'jpg',
          'jpeg',
          'png',
          'webp'
        ]

      };

    }

  });


const upload =
  multer({
    storage: storage
  });


// ========================================
// ENVOI DES PHOTOS
// ========================================

app.post(
  '/upload',
  verifierInviteUpload,
  upload.array('photos'),
  (req, res) => {

    const mariageId =
      req.session.mariage;


    if (!mariageId) {

      return res.status(401).send(
        'Connexion invité nécessaire.'
      );

    }


    const mariage =
      mariages.find(
        m => m.id === mariageId
      );


    if (!mariage) {

      return res.status(404).send(
        'Mariage introuvable.'
      );

    }


    return res.send(`

      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>Merci ❤️</title>

        <style>

          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background: #F8F5F4;
            color: #1F3A5F;
            padding: 60px 20px;
          }

          h1 {
            color: #C78C9A;
            font-size: 45px;
          }

          a {
            display: inline-block;
            margin-top: 30px;
            background: #1F3A5F;
            color: white;
            padding: 15px 30px;
            border-radius: 30px;
            text-decoration: none;
          }

        </style>

      </head>

      <body>

        <h1>Merci ❤️</h1>

        <p>
          Vos photos ont bien été envoyées.<br>
          Elles feront partie des précieux souvenirs<br>
          de notre journée.
        </p>

        <a href="/${mariage.id}">
          Retour au mariage
        </a>

      </body>

      </html>

    `);

  }
);


// ========================================
// GALERIE GÉNÉRALE
// ========================================

app.get(
  '/photos',
  verifierAdmin,
  async (req, res) => {

    try {

      const result =
        await cloudinary.search
          .expression(
            'folder:album-d-un-oui'
          )
          .sort_by(
            'created_at',
            'desc'
          )
          .execute();


      let html =
        '<h1>Galerie photos</h1>';


      result.resources.forEach(
        photo => {

          html += `
            <img
              src="${photo.secure_url}"
              width="300"
              style="margin:10px;"
            >
          `;

        }
      );


      return res.send(html);

    } catch (err) {

      console.error(err);

      return res.status(500).send(
        'Erreur lors du chargement des photos.'
      );

    }

  }
);


// ========================================
// LISTE DES PHOTOS
// ========================================

app.get(
  '/liste-photos',
  verifierAdmin,
  async (req, res) => {

    try {

      const result =
        await cloudinary.search
          .expression(
            'folder:album-d-un-oui'
          )
          .sort_by(
            'created_at',
            'desc'
          )
          .execute();


      return res.json(
        result.resources
      );

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        erreur: err.message
      });

    }

  }
);


// ========================================
// GALERIE D'UN MARIAGE
// ========================================

app.get(
  '/:mariage/galerie.html',
  verifierInvite,
  (req, res) => {

    const mariage =
      mariages.find(
        m => m.id === req.params.mariage
      );


    if (!mariage) {

      return res.status(404).send(
        'Mariage introuvable.'
      );

    }


    return res.sendFile(
      path.join(
        __dirname,
        'public',
        'galerie.html'
      )
    );

  }
);


// ========================================
// INSCRIPTION COUPLE
// ========================================

app.get(
  '/inscription',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'inscription.html'
      )
    );

  }
);


app.post(
  '/inscription',
  async (req, res) => {

    const nom =
      (req.body.nom || '')
        .trim();


    const email =
      (req.body.email || '')
        .trim()
        .toLowerCase();


    const password =
      req.body.password || '';


    const confirmation =
      req.body.confirmation || '';


    if (
      !nom ||
      !email ||
      !password ||
      !confirmation
    ) {

      return res.send(`
        <h1>Informations manquantes ❌</h1>

        <a href="/inscription">
          Réessayer
        </a>
      `);

    }


    if (password !== confirmation) {

      return res.send(`
        <h1>
          Les mots de passe ne correspondent pas ❌
        </h1>

        <a href="/inscription">
          Réessayer
        </a>
      `);

    }


    if (password.length < 8) {

      return res.send(`
        <h1>
          Mot de passe trop court ❌
        </h1>

        <p>
          Le mot de passe doit contenir
          au moins 8 caractères.
        </p>

        <a href="/inscription">
          Réessayer
        </a>
      `);

    }


    const emailExiste =
      comptes.find(
        compte =>
          compte.email.toLowerCase() === email
      );


    if (emailExiste) {

      return res.send(`
        <h1>
          Cette adresse existe déjà ❌
        </h1>

        <a href="/connexion-couple">
          Se connecter
        </a>
      `);

    }


    const motDePasseHash =
      await bcrypt.hash(
        password,
        10
      );


    const nouveauCompte = {

      id:
        Date.now().toString(),

      nom:
        nom,

      email:
        email,

      password:
        motDePasseHash,

      mariageId:
        null

    };


    comptes.push(
      nouveauCompte
    );


    fs.writeFileSync(
      path.join(
        __dirname,
        'config',
        'comptes.json'
      ),
      JSON.stringify(
        comptes,
        null,
        2
      )
    );


    return res.send(`

      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>Compte créé</title>

      </head>

      <body style="
        font-family:Arial;
        text-align:center;
        padding:60px 20px;
        background:#F8F5F4;
        color:#1F3A5F;
      ">

        <h1 style="color:#C78C9A;">
          Compte créé ❤️
        </h1>

        <p>
          Votre compte a bien été créé.
        </p>

        <a href="/connexion-couple">
          Se connecter 🔐
        </a>

      </body>

      </html>

    `);

  }
);


// ========================================
// CONNEXION COUPLE
// ========================================

app.get(
  '/connexion-couple',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'connexion-couple.html'
      )
    );

  }
);


app.post(
  '/connexion-couple',
  async (req, res) => {

    const email =
      (req.body.email || '')
        .trim()
        .toLowerCase();


    const password =
      req.body.password || '';


    const compte =
      comptes.find(
        c =>
          c.email.toLowerCase() === email
      );


    if (!compte) {

      return res.send(`
        <h1>
          Connexion impossible ❌
        </h1>

        <p>
          Email ou mot de passe incorrect.
        </p>

        <a href="/connexion-couple">
          Réessayer
        </a>
      `);

    }


    const motDePasseCorrect =
      await bcrypt.compare(
        password,
        compte.password
      );


    if (!motDePasseCorrect) {

      return res.send(`
        <h1>
          Connexion impossible ❌
        </h1>

        <p>
          Email ou mot de passe incorrect.
        </p>

        <a href="/connexion-couple">
          Réessayer
        </a>
      `);

    }


    req.session.couple = true;
    req.session.compteId = compte.id;


    return res.redirect(
      '/espace-couple'
    );

  }
);


// ========================================
// ESPACE COUPLE
// ========================================

app.get(
  '/espace-couple',
  verifierCouple,
  (req, res) => {

    const compte =
      comptes.find(
        c =>
          c.id === req.session.compteId
      );


    if (!compte) {

      return res.redirect(
        '/connexion-couple'
      );

    }


    let contenuMariage = '';


    if (compte.mariageId) {

      const mariage =
        mariages.find(
          m =>
            m.id === compte.mariageId
        );


      if (mariage) {

        contenuMariage = `

          <div style="
            background:#F8F5F4;
            padding:20px;
            border-radius:20px;
            margin-top:25px;
          ">

            <h2>
              ${mariage.prenoms}
            </h2>

            <p>
              ${mariage.date}
            </p>

            <p>
              Code invité :
              <strong>
                ${mariage.codeInvite}
              </strong>
            </p>

            <a
              href="/${mariage.id}"
              style="
                display:inline-block;
                margin-top:15px;
                background:#1F3A5F;
                color:white;
                padding:12px 20px;
                border-radius:25px;
                text-decoration:none;
              "
            >
              Voir mon mariage 💍
            </a>

          </div>

        `;

      }

    }


    return res.send(`

      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Mon espace mariage
        </title>

      </head>

      <body style="
        margin:0;
        min-height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        font-family:Arial;
        background:#F8F5F4;
        color:#1F3A5F;
      ">

        <div style="
          width:90%;
          max-width:500px;
          background:white;
          padding:35px 25px;
          border-radius:25px;
          text-align:center;
          box-shadow:0 5px 25px rgba(0,0,0,0.08);
        ">

          <h1 style="color:#C78C9A;">
            Bienvenue ${compte.nom} 💍
          </h1>

          ${
            compte.mariageId
            ?
            contenuMariage
            :
            `
              <p>
                Vous n'avez pas encore créé
                votre mariage.
              </p>

              <a
                href="/creer-mariage"
                style="
                  display:inline-block;
                  margin-top:15px;
                  background:#1F3A5F;
                  color:white;
                  padding:15px 25px;
                  border-radius:30px;
                  text-decoration:none;
                "
              >
                Créer mon mariage 💍
              </a>
            `
          }

          <br>

          <a
            href="/deconnexion-couple"
            style="
              display:inline-block;
              margin-top:25px;
              color:#1F3A5F;
            "
          >
            Se déconnecter
          </a>

        </div>

      </body>

      </html>

    `);

  }
);


// ========================================
// FORMULAIRE CRÉATION MARIAGE
// ========================================

app.get(
  '/creer-mariage',
  verifierCouple,
  (req, res) => {

    res.send(`

      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Créer mon mariage 💍
        </title>

      </head>

      <body style="
        margin:0;
        min-height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        font-family:Arial;
        background:#F8F5F4;
        color:#1F3A5F;
      ">

        <div style="
          width:90%;
          max-width:500px;
          background:white;
          padding:35px 25px;
          border-radius:25px;
          box-shadow:0 5px 25px rgba(0,0,0,0.08);
        ">

          <h1 style="
            color:#C78C9A;
            text-align:center;
          ">
            Créer mon mariage 💍
          </h1>

          <form
            action="/api/couple/mariage"
            method="POST"
          >

            <label>
              Prénoms des mariés
            </label>

            <input
              type="text"
              name="prenoms"
              placeholder="Élodie & Émilie"
              required
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Identifiant du mariage
            </label>

            <input
              type="text"
              name="id"
              placeholder="elodie-emilie"
              required
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Date du mariage
            </label>

            <input
              type="date"
              name="date"
              required
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Heure
            </label>

            <input
              type="time"
              name="heure"
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Mairie
            </label>

            <input
              type="text"
              name="mairie"
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Lieu de réception
            </label>

            <input
              type="text"
              name="lieu"
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            >

            <label>
              Couleur principale
            </label>

            <input
              type="color"
              name="couleur"
              value="#1F3A5F"
              style="
                width:100%;
                height:50px;
                margin:8px 0 18px;
              "
            >

            <label>
              Message d'accueil
            </label>

            <textarea
              name="message"
              rows="4"
              placeholder="Bienvenue dans notre album..."
              style="
                width:100%;
                box-sizing:border-box;
                padding:14px;
                margin:8px 0 18px;
                border:1px solid #ddd;
                border-radius:12px;
              "
            ></textarea>

            <button
              type="submit"
              style="
                width:100%;
                padding:15px;
                border:none;
                border-radius:30px;
                background:#1F3A5F;
                color:white;
                font-size:16px;
              "
            >
              Créer mon mariage ❤️
            </button>

          </form>

        </div>

      </body>

      </html>

    `);

  }
);


// ========================================
// CRÉATION DU MARIAGE PAR LE COUPLE
// ========================================

app.post(
  '/api/couple/mariage',
  verifierCouple,
  (req, res) => {

    const compte =
      comptes.find(
        c =>
          c.id === req.session.compteId
      );


    if (!compte) {

      return res.status(401).send(
        'Compte introuvable.'
      );

    }


    if (compte.mariageId) {

      return res.send(`
        <h1>
          Vous avez déjà un mariage ❌
        </h1>

        <a href="/espace-couple">
          Retour à mon espace
        </a>
      `);

    }


    const id =
      (req.body.id || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');


    if (!id) {

      return res.send(`
        <h1>
          Identifiant invalide ❌
        </h1>

        <a href="/creer-mariage">
          Réessayer
        </a>
      `);

    }


    const idExiste =
      mariages.find(
        mariage =>
          mariage.id === id
      );


    if (idExiste) {

      return res.send(`
        <h1>
          Cet identifiant existe déjà ❌
        </h1>

        <p>
          Choisissez un autre identifiant.
        </p>

        <a href="/creer-mariage">
          Réessayer
        </a>
      `);

    }


    // Génération automatique du code invité

    let codeInvite;


    do {

      codeInvite =
        crypto
          .randomBytes(4)
          .toString('hex')
          .toUpperCase();

    } while (
      mariages.some(
        mariage =>
          mariage.codeInvite === codeInvite
      )
    );


    const nouveauMariage = {

      id:
        id,

      prenoms:
        req.body.prenoms,

      date:
        req.body.date,

      heure:
        req.body.heure || '',

      mairie:
        req.body.mairie || '',

      lieu:
        req.body.lieu || '',

      couleur:
        req.body.couleur || '#1F3A5F',

      message:
        req.body.message || '',

      codeInvite:
        codeInvite

    };


    mariages.push(
      nouveauMariage
    );


    compte.mariageId =
      nouveauMariage.id;


    fs.writeFileSync(
      path.join(
        __dirname,
        'config',
        'mariages.json'
      ),
      JSON.stringify(
        mariages,
        null,
        2
      )
    );


    fs.writeFileSync(
      path.join(
        __dirname,
        'config',
        'comptes.json'
      ),
      JSON.stringify(
        comptes,
        null,
        2
      )
    );


    return res.send(`

      <!DOCTYPE html>

      <html lang="fr">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Mariage créé ❤️
        </title>

      </head>

      <body style="
        margin:0;
        min-height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        font-family:Arial;
        background:#F8F5F4;
        color:#1F3A5F;
      ">

        <div style="
          width:90%;
          max-width:500px;
          background:white;
          padding:40px 25px;
          border-radius:25px;
          text-align:center;
          box-shadow:0 5px 25px rgba(0,0,0,0.08);
        ">

          <h1 style="color:#C78C9A;">
            Votre mariage est créé 💍
          </h1>

          <p>
            ${nouveauMariage.prenoms}
          </p>

          <p>
            Votre code invité :
          </p>

          <h2 style="
            letter-spacing:3px;
            color:#1F3A5F;
          ">
            ${nouveauMariage.codeInvite}
          </h2>

          <p>
            Lien de votre album :
          </p>

          <p>
            <strong>
              ${req.protocol}://${req.get('host')}/${nouveauMariage.id}
            </strong>
          </p>

          <a
            href="/espace-couple"
            style="
              display:inline-block;
              margin-top:20px;
              background:#1F3A5F;
              color:white;
              padding:15px 25px;
              border-radius:30px;
              text-decoration:none;
            "
          >
            Retour à mon espace ❤️
          </a>

        </div>

      </body>

      </html>

    `);

  }
);


// ========================================
// DÉCONNEXION COUPLE
// ========================================

app.get(
  '/deconnexion-couple',
  (req, res) => {

    req.session.couple = false;
    req.session.compteId = null;

    return res.redirect(
      '/connexion-couple'
    );

  }
);


// ========================================
// CONNEXION ADMIN
// ========================================

app.get(
  '/login',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'login.html'
      )
    );

  }
);


app.post(
  '/login',
  (req, res) => {

    const username =
      req.body.username || '';

    const password =
      req.body.password || '';


    const adminUsername =
      process.env.ADMIN_USERNAME ||
      'admin';

    const adminPassword =
      process.env.ADMIN_PASSWORD ||
      'tonmotdepasse';


    if (
      username === adminUsername &&
      password === adminPassword
    ) {

      req.session.admin = true;

      return res.redirect(
        '/admin'
      );

    }


    return res.send(`
      <h1>
        Identifiants incorrects ❌
      </h1>

      <a href="/login">
        Réessayer
      </a>
    `);

  }
);


// ========================================
// DÉCONNEXION ADMIN
// ========================================

app.get(
  '/logout',
  (req, res) => {

    req.session.destroy(() => {

      res.redirect('/login');

    });

  }
);


// ========================================
// DÉCONNEXION INVITÉ
// ========================================

app.get(
  '/deconnexion-invite',
  (req, res) => {

    req.session.invite = false;
    req.session.mariage = null;

    return res.redirect(
      '/connexion'
    );

  }
);


// ========================================
// ADMIN
// ========================================

app.get(
  '/admin',
  verifierAdmin,
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'admin.html'
      )
    );

  }
);


// ========================================
// CRÉER UN MARIAGE PAR L'ADMIN
// ========================================

app.post(
  '/api/admin/mariage',
  verifierAdmin,
  (req, res) => {

    const nouveauMariage = {

      id:
        (req.body.id || '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-'),

      prenoms:
        req.body.prenoms,

      date:
        req.body.date,

      heure:
        req.body.heure || '',

      mairie:
        req.body.mairie || '',

      lieu:
        req.body.lieu || '',

      couleur:
        req.body.couleur || '#1F3A5F',

      message:
        req.body.message || '',

      codeInvite:
        req.body.codeInvite ||
        null

    };


    if (!nouveauMariage.id) {

      return res.status(400).json({
        erreur:
          'Identifiant du mariage obligatoire.'
      });

    }


    const existe =
      mariages.find(
        m =>
          m.id === nouveauMariage.id
      );


    if (existe) {

      return res.status(400).json({
        erreur:
          'Cet identifiant existe déjà.'
      });

    }


    mariages.push(
      nouveauMariage
    );


    fs.writeFileSync(
      path.join(
        __dirname,
        'config',
        'mariages.json'
      ),
      JSON.stringify(
        mariages,
        null,
        2
      )
    );


    return res.json({

      message:
        'Mariage créé avec succès 💍',

      lien:
        `/${nouveauMariage.id}`,

      mariage:
        nouveauMariage

    });

  }
);


// ========================================
// PAGE DU MARIAGE
// ========================================

app.get(
  '/:mariage',
  verifierInvite,
  (req, res) => {

    const mariage =
      mariages.find(
        m =>
          m.id === req.params.mariage
      );


    if (!mariage) {

      return res.status(404).send(
        'Mariage introuvable.'
      );

    }


    return res.sendFile(
      path.join(
        __dirname,
        'public',
        'index.html'
      )
    );

  }
);


// ========================================
// DÉMARRAGE
// ========================================

app.listen(
  PORT,
  () => {

    console.log(
      `Serveur lancé sur le port ${PORT}`
    );

  }
);
