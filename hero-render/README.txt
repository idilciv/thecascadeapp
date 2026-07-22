CASCADE HERO — YÜKSEK KALİTELİ KARE RENDER'I (Mac'inde çalıştır)

Bu klasör, sitenin hero'sundaki dağ+güneş karelerini gerçek Spline sahnesinden
yeniden, yüksek kalitede üretir. Senin Mac'inde GPU olduğu için hızlıdır (birkaç dk).
Fog/bulut katmanları kapatılır, çerçeve mevcut karelerle birebir hizalanır.

ADIMLAR (Terminal):

1) Bu klasöre gir:
     cd ~/thecascadeapp/hero-render

2) Bağımlılıkları bir kez kur:
     npm init -y
     npm i playwright sharp
     npx playwright install chromium

3) Render'ı çalıştır:
     node render_hero.cjs

   Bittiğinde 144 kare doğrudan ../assets/frames içine yazılır
   (f00..f71 masaüstü, m00..m71 mobil), eski dosyaların üzerine.

4) Yayınla (repo kökünden):
     cd ~/thecascadeapp
     git add assets/frames
     git commit -m "Hero: gerçek sahneden yüksek kaliteli render"
     git push

   Push sonrası GitHub Pages 1-2 dk'da yayınlar; siteye girip Cmd+Shift+R.

NOTLAR
- Node kurulu olmalı (node -v ile kontrol et; yoksa nodejs.org'dan kur).
- Render yavaşsa (GPU yerine yazılıma düşerse), render_hero.cjs içinde
  chromium.launch({ headless:true }) satırını
  chromium.launch({ headless:false }) yap — pencere açılır ama GPU'yu kullanır.
- Bu klasördeki spline.html / spline-viewer.js / zen_mode.splinecode sahne
  dosyalarıdır; silme.
