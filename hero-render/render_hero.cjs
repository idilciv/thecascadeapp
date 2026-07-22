/*
 * Cascade hero frame renderer  —  RUN THIS ON YOUR MAC (uses your GPU, ~a few minutes).
 *
 * Loads the real Spline scene (spline.html + spline-viewer.js + zen_mode.splinecode in this
 * folder), hides the fog/cloud layers, and re-renders all 72 desktop (f00..f71) + 72 mobile
 * (m00..m71) hero frames at HIGH RESOLUTION, aligned to the site's existing framing, straight
 * into ../assets/frames.
 *
 * QUALITY KNOB: DESK_W below is the desktop frame width. 2880 is a strong balance for large
 * screens. For maximum crispness on 4K/5K monitors set it to 3840 (files get heavier, page
 * loads a bit slower). 1920 = original size.
 *
 * Setup (once), inside this folder:
 *     npm init -y
 *     npm i playwright sharp
 *     npx playwright install chromium
 * Run:
 *     node render_hero.cjs
 * Publish (from repo root):
 *     git add assets/frames && git commit -m "Hero: crisp scene re-render" && git push
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const sharp = require('sharp');

const DESK_W = 2880;                 // <-- desktop frame width (2880 balanced; 3840 = max for 4K/5K)
const MOB_W  = 1290;                 // mobile frame width (retina phones)

const ROOT = __dirname;
const OUT  = path.join(__dirname, '..', 'assets', 'frames');
const PORT = 8137;

// screen = scale*render + translate (CSS px, transform-origin 0 0) -> matches the site's framing.
// ssdsf = supersample density used while rendering (higher = cleaner anti-aliasing, then downscaled to out size).
const SETS = [
  { prefix:'f', cssW:1920, cssH:1050, scale:1.14, tx:-135, ty:-1.8, ssdsf:3, outW:DESK_W, outH:Math.round(DESK_W*1050/1920) },
  { prefix:'m', cssW:860,  cssH:1116, scale:1.15, tx:-230, ty:-88,  ssdsf:2, outW:MOB_W,  outH:Math.round(MOB_W*1116/860) },
];
const COUNT = 72;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.wasm':'application/wasm', '.png':'image/png', '.splinecode':'application/octet-stream' };
const sunValue = i => 82 - (i/(COUNT-1))*172;

(async () => {
  if (!fs.existsSync(OUT)) { console.error('Cannot find', OUT, '- run from inside the hero-render folder in your site repo.'); process.exit(1); }
  const srv = http.createServer((req,res)=>{
    let fp = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise(r => srv.listen(PORT, r));

  const browser = await chromium.launch({ headless:true });   // uses your Mac GPU
  try {
    for (const set of SETS) {
      const ctx = await browser.newContext({ viewport:{ width:set.cssW, height:set.cssH }, deviceScaleFactor:set.ssdsf });
      const page = await ctx.newPage();
      await page.goto(`http://localhost:${PORT}/spline.html`, { waitUntil:'load', timeout:60000 });
      // TRANSPARENT SKY: frames now exclude the sun (drawn procedurally on the site),
      // so the sky must be transparent for the sun to show through from behind.
      await page.addStyleTag({ content:
        `html,body{background:transparent !important;overflow:hidden;}
         spline-viewer{transform-origin:0 0;transform:translate(${set.tx}px,${set.ty}px) scale(${set.scale});}` });
      await page.waitForFunction(() => {
        const v = document.querySelector('spline-viewer');
        return v && v._spline && typeof v._spline.setVariable === 'function';
      }, { timeout:60000 });
      await page.waitForTimeout(4000);
      const hideObjs = (names) => page.evaluate((ns) => {
        const app = document.querySelector('spline-viewer')._spline;
        ns.forEach(n => app.getAllObjects().forEach(o => { if (o.name === n) { try { o.visible = false; } catch(e){} } }));
      }, names);
      // fog/comet + THE SUN DISC (site draws the sun itself for perfectly smooth motion).
      // sunLight kalir -> dagin isigi yine gunesle birlikte degisir.
      await hideObjs(['fog','fog1.png','fog2.png','comet','sunshape_Sphere (alt)']);
      for (let i=0;i<COUNT;i++){
        await page.evaluate(v => window.cascadeSetProgress(v), sunValue(i));
        await page.waitForTimeout(500);
        const shot = await page.screenshot({ clip:{ x:0, y:0, width:set.cssW, height:set.cssH }, animations:'disabled', timeout:90000, omitBackground:true });
        if (i === 0) {   // gokyuzu gercekten seffaf mi? degilse sky-reflector'u gizleyip uyar
          const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject:true });
          const aTL = data[(5*info.width+5)*4+3];
          if (aTL > 16) { console.log('\n[uyari] gokyuzu opak cikti -> sky reflector gizleniyor'); await hideObjs(['sky  (reflector)']); }
        }
        const name = `${set.prefix}${String(i).padStart(2,'0')}.webp`;
        await sharp(shot).resize(set.outW, set.outH).webp({ quality:90 }).toFile(path.join(OUT, name));
        process.stdout.write(`\r${set.prefix}: ${i+1}/${COUNT}  (${set.outW}x${set.outH})   `);
      }
      console.log(`\n${set.prefix} set done.`);
      await ctx.close();
    }
    console.log('\nAll 144 hero frames written. Now: git add assets/frames && git commit -m "Hero: crisp scene re-render" && git push');
  } catch (e) {
    console.error('\nRender failed:', e.message);
    process.exit(2);
  } finally {
    await browser.close(); srv.close();
  }
})();
