const express = require ('express');
const multer = require ('multer');

const app = express(); 

app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});
app.post('/upload', upload.array('photos'), (req, res) => {
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
app.use('/uploads', express.static('uploads'));

app.get('/photos', (req, res) => {

  const fs = require('fs');

  fs.readdir('uploads', (err, files) => {

    if (err) {

      return res.send('Erreur de lecture des photos');

    }

    let html = '<h1>Galerie photos</h1>';

    files.forEach(file => {

      html += `<img src="/uploads/${file}" width="300" style="margin:10px;">`;

    });

    res.send(html);

  });

});
app.get('/liste-photos', (req, res) => {

  const fs = require('fs');

  fs.readdir('uploads', (err, files) => {

    if (err) {

      return res.json([]);

    }

    res.json(files);

  });

});
console.log("version avec liste-photos chargée");
  app.listen(3000, () => {
  console.log('Serveur lancé sur le port 3000');
  });