CASCADE HERO — AI DETAY ARTIRMA (Real-ESRGAN, ücretsiz)  ·  Mac'inde çalıştır

Bu, hero karelerine (assets/frames) yapay zekâ ile inandırıcı kaya detayı + keskinlik ekler.
Karelerin ÜZERİNE yazar; istersen önce şu anki halini git'e commit'leyip yedekle.

ADIMLAR (Terminal):

1) Bu klasöre gir:
     cd ~/thecascadeapp/hero-render

2) Gereken paketleri kur (bir kez):
     python3 -m pip install --upgrade torch spandrel pillow numpy requests

3) Çalıştır (modeli ilk seferde kendi indirir):
     python3 upscale_frames.py

   Apple Silicon'da GPU (MPS) kullanır → birkaç dakika. Eski Intel'de CPU → daha uzun.

4) Sonuca bak: assets/frames içindeki kareler güncellendi. Beğenirsen yayınla:
     cd ~/thecascadeapp
     git add assets/frames
     git commit -m "Hero: AI detay artirma"
     git push

AYAR (script'in başında):
  STRENGTH = 0.7   # detay dozu. Çok "işlenmiş"/titrek durursa 0.4-0.5'e düşür,
                   # daha fazla detay istersen 0.85'e çıkar.
  KEEP_SKY = True  # koyu gökyüzünü orijinal (temiz) bırakır; yeniden grenlenmez.

NOTLAR
- Bu bir animasyon: her kare ayrı işlendiği için üretilen mikro-detay kareler arası
  hafif oynayabilir (shimmer). Rahatsız ederse STRENGTH'i düşür ya da bana söyle,
  "statik-dağ + ayrı güneş" titremesiz sürümünü kurayım.
- İş bitmeden karelerin bir kopyasını istersen: git zaten geçmişi tutuyor, geri almak
  kolay (git checkout -- assets/frames).
- Beğenmezsen render_hero.cjs'i tekrar çalıştırıp temiz (AI'sız) karelere dönebilirsin.
