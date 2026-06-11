#!/usr/bin/env node

/**
 * Generate PWA icons in PNG format
 * Creates 192x192 and 512x512 icons from SVG source
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Create icons directory if it doesn't exist
const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG template - Support Group Finder icon with teal color scheme
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#0D9488" rx="100"/>

  <!-- Outer circle for depth -->
  <circle cx="256" cy="256" r="200" fill="#14B8A6" opacity="0.2"/>

  <!-- People/Community icon -->
  <!-- Center person -->
  <circle cx="256" cy="140" r="35" fill="white"/>
  <path d="M 220 195 Q 220 175 256 175 Q 292 175 292 195 L 292 250 Q 292 280 256 280 Q 220 280 220 250 Z" fill="white"/>

  <!-- Left person -->
  <circle cx="160" cy="160" r="28" fill="white"/>
  <path d="M 132 210 Q 132 195 160 195 Q 188 195 188 210 L 188 255 Q 188 280 160 280 Q 132 280 132 255 Z" fill="white"/>

  <!-- Right person -->
  <circle cx="352" cy="160" r="28" fill="white"/>
  <path d="M 324 210 Q 324 195 352 195 Q 380 195 380 210 L 380 255 Q 380 280 352 280 Q 324 280 324 255 Z" fill="white"/>

  <!-- Support/Heart element bottom -->
  <path d="M 256 320 L 280 340 Q 280 360 256 375 Q 232 360 232 340 Z" fill="#10B981" opacity="0.9"/>

  <!-- Bottom decorative elements - circles representing connection -->
  <circle cx="200" cy="420" r="20" fill="white" opacity="0.8"/>
  <circle cx="256" cy="435" r="20" fill="white" opacity="0.8"/>
  <circle cx="312" cy="420" r="20" fill="white" opacity="0.8"/>

  <!-- Connecting lines -->
  <line x1="200" y1="420" x2="256" y2="435" stroke="white" stroke-width="3" opacity="0.5"/>
  <line x1="256" y1="435" x2="312" y2="420" stroke="white" stroke-width="3" opacity="0.5"/>
</svg>
`;

// Generate icons at different sizes
const sizes = [192, 512];

// Source assets for @capacitor/assets (native Android/iOS icons & splash screens)
const capacitorAssetsDir = path.join(process.cwd(), 'assets');

async function generateIcons() {
  try {
    console.log('Generating PWA icons...');

    for (const size of sizes) {
      const filename = path.join(iconsDir, `icon-${size}x${size}.png`);

      await sharp(Buffer.from(svgIcon))
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(filename);

      console.log(`✓ Created ${filename}`);
    }

    console.log('\nGenerating Capacitor source assets...');
    if (!fs.existsSync(capacitorAssetsDir)) {
      fs.mkdirSync(capacitorAssetsDir, { recursive: true });
    }

    // 1024x1024 app icon
    await sharp(Buffer.from(svgIcon))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(capacitorAssetsDir, 'icon.png'));
    console.log('✓ Created assets/icon.png (1024x1024)');

    // 2732x2732 splash screens: centered logo on solid background
    const logo = await sharp(Buffer.from(svgIcon)).resize(1024, 1024).png().toBuffer();
    for (const [name, background] of [['splash.png', '#0D9488'], ['splash-dark.png', '#042F2E']]) {
      await sharp({
        create: { width: 2732, height: 2732, channels: 4, background }
      })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toFile(path.join(capacitorAssetsDir, name));
      console.log(`✓ Created assets/${name} (2732x2732)`);
    }

    console.log('\n✓ All icons generated successfully!');
    console.log('Run "npx @capacitor/assets generate" to produce native icons/splash screens.');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
