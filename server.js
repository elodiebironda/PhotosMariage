require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const express = require ('express');
const multer = require ('multer');
const mariages = require('./config/mariages.json');

const app = express(); 

app.use(express.static('public'));



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get('/api/mariage/:id/photos', async (req, res) => {

  try {

    const dossier = `album-d-un-oui/${req.params.id}`;

    const result = await cloudinary.search
      .expression(`folder:${dossier}`)
      .sort_by('created_at', 'desc')
      .execute();

    console.log(JSON.stringify(result.resources, null, 2));

    res.json(result.resources);

  } catch (err) {

    console.error(err);
    res.status(500).json({ erreur: err.message });

  }

});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {

    return {
      folder: `album-d-un-oui/${req.body.mariage || "elodie-emilie"}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"]
    };

  }
});
const upload = multer({ storage: storage });

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});
console.log(mariages);

app.post('/upload', upload.array('photos'), (req, res) => {

  console.log("BODY COMPLET :", req.body);
  console.log("MARIAGE REÇU :", req.body.mariage);

  res.send(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
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

    <a href="/">Retour à l'accueil</a>

  </body>
  </html>
  `);
});
app.get('/photos', async (req, res) => {

  const result = await cloudinary.search
    .expression('folder:album-d-un-oui')
    .sort_by('created_at', 'desc')
    .execute();
    console.log(JSON.stringify(result.resources, null, 2));

  let html = '<h1>Galerie photos</h1>';

  result.resources.forEach(photo => {

    html += `
      <img src="${photo.secure_url}" width="300" style="margin:10px;">
    `;

  });

  res.send(html);

});
app.get('/liste-photos', async (req, res) => {

  const result = await cloudinary.search
    .expression('folder:album-d-un-oui')
    .execute();

  res.json(result.resources);

});


console.log("version avec liste-photos chargée");

app.get('/:mariage/galerie.html', (req, res) => {
  res.sendFile(__dirname + '/public/galerie.html');
});

app.get('/api/mariage/:id', (req, res) => {
  const mariage = mariages.find(m => m.id === req.params.id);

  if (!mariage) {
    return res.status(404).json({ erreur: "Mariage introuvable" });
  }

  res.json(mariage);
});

app.get('/:mariage', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});