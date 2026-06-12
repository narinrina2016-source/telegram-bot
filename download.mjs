import fs from 'fs';
import path from 'path';
import https from 'https';

const models = [
  'ssd_mobilenet_v1_model-weights_manifest.json',
  'ssd_mobilenet_v1_model.weights.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.weights.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.weights.bin'
];

const dir = path.join(process.cwd(), 'public', 'models');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function download(filename) {
  const url = `https://raw.githubusercontent.com/vladmandic/face-api/master/model/${filename}`;
  const dest = path.join(dir, filename);
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading models...');
  for (const m of models) {
    console.log(`Downloading ${m}`);
    await download(m);
  }
  console.log('Done.');
}

run();
