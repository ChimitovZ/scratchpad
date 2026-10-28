const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const NAMES = [
  'trash-2',
  'save',
  'folder-open',
  'copy',
  'clipboard-paste',
  'settings',
  'minus',
  'wrap-text',
  'notebook-pen'
]

const root = path.join(__dirname, '..')
const srcDir = path.join(root, 'node_modules', 'lucide-static', 'icons')
const iconDir = path.join(root, 'assets', 'icons')
const assets = path.join(root, 'assets')

fs.mkdirSync(iconDir, { recursive: true })

for (const name of NAMES) {
  const from = path.join(srcDir, name + '.svg')
  if (!fs.existsSync(from)) throw new Error('Нет иконки: ' + name)
  fs.copyFileSync(from, path.join(iconDir, name + '.svg'))
}

function colorize(svg, color) {
  return svg.replace(/currentColor/g, color)
}

async function raster(svg, size) {
  return sharp(Buffer.from(svg), { density: Math.max(288, size * 12) })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer()
}

async function appPng(svg, size, dest) {
  const pad = Math.round(size * 0.2)
  const inner = size - pad * 2
  const icon = await raster(colorize(svg, '#f4f4f5'), inner)
  const rx = Math.round(size * 0.22)
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${rx}" fill="#3d4a5c"/></svg>`
  )
  await sharp(bg)
    .composite([{ input: icon, top: pad, left: pad }])
    .png()
    .toFile(dest)
}

async function main() {
  const pngToIco = (await import('png-to-ico')).default
  const svg = fs.readFileSync(path.join(iconDir, 'notebook-pen.svg'), 'utf8')
  await appPng(svg, 16, path.join(assets, 'icon-16.png'))
  await appPng(svg, 32, path.join(assets, 'icon-32.png'))
  await appPng(svg, 256, path.join(assets, 'icon-256.png'))
  await sharp(await raster(colorize(svg, '#f4f4f5'), 32)).toFile(path.join(assets, 'tray-light.png'))
  await sharp(await raster(colorize(svg, '#1a1a1a'), 32)).toFile(path.join(assets, 'tray-dark.png'))
  const ico = await pngToIco([
    path.join(assets, 'icon-16.png'),
    path.join(assets, 'icon-32.png'),
    path.join(assets, 'icon-256.png')
  ])
  fs.writeFileSync(path.join(assets, 'app.ico'), ico)
  console.log('Иконки готовы')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
