import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the public directory exists
const publicDir = path.join(__dirname, 'client', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Path to input SVG file
const svgPath = path.join(publicDir, 'icon.svg');

// Generate 192x192 icon
sharp(svgPath)
  .resize(192, 192)
  .png()
  .toFile(path.join(publicDir, 'icon-192.png'))
  .then(() => console.log('Generated 192x192 icon'))
  .catch(err => console.error('Error generating 192x192 icon:', err));

// Generate 512x512 icon
sharp(svgPath)
  .resize(512, 512)
  .png()
  .toFile(path.join(publicDir, 'icon-512.png'))
  .then(() => console.log('Generated 512x512 icon'))
  .catch(err => console.error('Error generating 512x512 icon:', err));