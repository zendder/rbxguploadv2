const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.size > 5 * 1024 * 1024) {
      return cb(new Error('File size exceeds 5MB limit.'));
    }
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
}).single('file');

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RBXG Upload</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
        .container { background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 0 20px rgba(0,0,0,0.1); text-align: center; }
        form { margin-bottom: 20px; }
        input[type="file"] { margin-bottom: 20px; }
        .upload-btn { 
          background-color: #007bff; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 30px; 
          cursor: pointer; 
          font-size: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .upload-btn:hover { 
          background-color: #0056b3; 
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(0,0,0,0.15);
        }
        .upload-btn:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .error { color: red; margin-top: 10px; }
        .info { color: #666; margin-top: 20px; font-size: 0.9em; }
      </style>
      <script>
        function validateFile() {
          const fileInput = document.getElementById('fileInput');
          const file = fileInput.files[0];
          if (file && file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit.');
            fileInput.value = '';
            return false;
          }
          return true;
        }
      </script>
    </head>
    <body>
      <div class="container">
        <h1>RBXG Upload</h1>
        <form action="/upload" method="post" enctype="multipart/form-data" onsubmit="return validateFile()">
          <input type="file" name="file" id="fileInput" accept="image/*,video/*" />
          <button type="submit" class="upload-btn">Upload</button>
        </form>
        <div class="info">Max file size: 5MB. Images and videos only.</div>
        <div class="error"></div>
      </div>
    </body>
    </html>
  `);
});

app.post('/upload', (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      return res.status(400).send(`
        <script>
          alert("${err.message}");
          window.location.href = "/";
        </script>
      `);
    }

    if (!req.file) {
      return res.status(400).send(`
        <script>
          alert("No file uploaded.");
          window.location.href = "/";
        </script>
      `);
    }

    const file = req.file;
    const form = new FormData();
    form.append('file', fs.createReadStream(file.path), file.originalname);

    axios.post('https://telegra.ph/upload', form, {
      headers: form.getHeaders(),
    })
    .then(response => {
      console.log('API Response:', response.data);
      if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].src) {
        const uploadedFile = response.data[0];
        const mirroredUrl = uploadedFile.src;
        res.redirect(mirroredUrl);
      } else {
        throw new Error('Max file size 5MB. Images and videos only.');
      }
    })
    .catch(error => {
      console.error('Error uploading file:', error);
      res.status(500).send(`
        <script>
          alert("Max file size 5MB. Images and videos only.");
          window.location.href = "/";
        </script>
      `);
    });
  });
});

app.get('/file/:filename', async (req, res) => {
  const filename = req.params.filename;
  const telegraphUrl = `https://telegra.ph/file/${filename}`;

  try {
    const response = await axios.get(telegraphUrl, { responseType: 'stream' });
    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).send('Error fetching file');
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});