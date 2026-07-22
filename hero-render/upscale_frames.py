#!/usr/bin/env python3
"""
Cascade hero — AI detay artırma (Real-ESRGAN)   ·   Mac'inde çalıştır.

../assets/frames içindeki 144 kareyi (f00..f71, m00..m71) Real-ESRGAN ile işler:
dağa/güneşe inandırıcı detay + keskinlik ekler, sonra aynı boyuta indirip yerine yazar.
Gökyüzü (koyu boş alan) korunur ki yeniden grenlenmesin.

KURULUM (bir kez), bu klasörde:
    python3 -m pip install --upgrade torch spandrel pillow numpy requests
ÇALIŞTIR:
    python3 upscale_frames.py
YAYINLA (repo kökünden):
    git add assets/frames && git commit -m "Hero: AI detay artirma" && git push

NOT (titreme): bu bir animasyon; her kare bağımsız işlenir, üretilen mikro-detay kareler
arası hafif oynayabilir (shimmer). Canlıda rahatsız ederse söyle, "statik-dağ + ayrı güneş"
titremesiz sürümünü kurarım. İlk denemede STRENGTH'i düşük tutmak titremeyi azaltır.
"""
import os, sys, io, urllib.request, numpy as np
from PIL import Image

STRENGTH   = 0.7     # 0..1  detayın ne kadar bindirileceği (düşük = daha az titreme). 0.7 iyi başlangıç.
KEEP_SKY   = True    # koyu gökyüzünü orijinal (temiz) bırak
FRAMES_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'frames')
MODEL_DIR  = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'RealESRGAN_x4plus.pth')
MODEL_URLS = [
    'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth',
]

def log(*a): print(*a, flush=True)

def _download(u):
    # 1) requests + certifi (macOS Python'un SSL cert sorununu aşar)
    try:
        import requests, certifi
        with requests.get(u, stream=True, timeout=300, verify=certifi.where(),
                          headers={'User-Agent':'Mozilla/5.0'}) as r:
            r.raise_for_status()
            with open(MODEL_PATH,'wb') as f:
                for chunk in r.iter_content(1<<20):
                    if chunk: f.write(chunk)
        return os.path.getsize(MODEL_PATH) > 1_000_000
    except Exception as e:
        log('  requests olmadi:', e)
    # 2) son çare: sertifika doğrulamasız urllib
    try:
        import ssl
        ctx = ssl._create_unverified_context()
        req = urllib.request.Request(u, headers={'User-Agent':'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=300, context=ctx) as r, open(MODEL_PATH,'wb') as f:
            f.write(r.read())
        return os.path.getsize(MODEL_PATH) > 1_000_000
    except Exception as e:
        log('  urllib olmadi:', e)
    return False

def ensure_model():
    os.makedirs(MODEL_DIR, exist_ok=True)
    if os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) > 1_000_000:
        return
    for u in MODEL_URLS:
        log('Model indiriliyor:', u)
        if _download(u):
            log('  indirildi.'); return
    sys.exit('Model indirilemedi. Alternatif: tarayıcıdan indirip hero-render/models/ '
             'içine RealESRGAN_x4plus.pth olarak koy:\n  ' + MODEL_URLS[0])

def load_model():
    import torch
    from spandrel import ModelLoader
    dev = 'mps' if torch.backends.mps.is_available() else ('cuda' if torch.cuda.is_available() else 'cpu')
    log('Cihaz:', dev)
    model = ModelLoader().load_from_file(MODEL_PATH)
    model.to(dev).eval()
    return model, dev, torch

def esrgan_tiled(img, model, dev, torch, tile=256, overlap=16):
    """img: HxWx3 uint8 -> 4x HxWx3 uint8, tiled to save memory."""
    H, W, _ = img.shape
    scale = getattr(model, 'scale', 4)
    out = np.zeros((H*scale, W*scale, 3), np.uint8)
    x = np.ascontiguousarray(img.astype(np.float32)/255.0)
    for y0 in range(0, H, tile):
        for x0 in range(0, W, tile):
            y1, x1 = min(y0+tile, H), min(x0+tile, W)
            ya, xa = max(0, y0-overlap), max(0, x0-overlap)
            yb, xb = min(H, y1+overlap), min(W, x1+overlap)
            patch = x[ya:yb, xa:xb]
            t = torch.from_numpy(patch).permute(2,0,1).unsqueeze(0).to(dev)
            with torch.no_grad():
                o = model(t).clamp(0,1)[0].permute(1,2,0).cpu().numpy()
            # trim overlap back to the core tile, place into output
            ty0, tx0 = (y0-ya)*scale, (x0-xa)*scale
            core = o[ty0:ty0+(y1-y0)*scale, tx0:tx0+(x1-x0)*scale]
            out[y0*scale:y1*scale, x0*scale:x1*scale] = (core*255).round().astype(np.uint8)
    return out

def sky_mask(img):
    """1 where clean dark sky (keep original), 0 on mountain/sun."""
    g = np.asarray(Image.fromarray(img).convert('L'), np.float32)/255.0
    from PIL import ImageFilter
    gb = np.asarray(Image.fromarray((g*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32)/255.0
    m = np.clip((0.06 - gb)/0.06, 0, 1)     # very dark -> sky
    return m[...,None]

def process(path, model, dev, torch):
    im = Image.open(path).convert('RGBA')          # yeni kareler seffaf gokyuzulu (alfa korunur)
    W, H = im.size
    alpha = im.split()[3]
    rgb = Image.new('RGB', im.size, (8, 8, 11)); rgb.paste(im, mask=alpha)
    src = np.asarray(rgb)
    hi = esrgan_tiled(src, model, dev, torch)                       # 4x, detailed
    hi_ds = np.asarray(Image.fromarray(hi).resize((W, H), Image.LANCZOS), np.float32)
    base = src.astype(np.float32)
    blended = base*(1-STRENGTH) + hi_ds*STRENGTH                    # dose the detail
    if KEEP_SKY:
        m = sky_mask(src)                                          # keep clean sky
        blended = base*m + blended*(1-m)
    out = Image.fromarray(np.clip(blended,0,255).astype(np.uint8)).convert('RGBA')
    out.putalpha(alpha)                            # alfa (seffaf gokyuzu) geri takilir
    out.save(path, 'WEBP', quality=90)

def main():
    if not os.path.isdir(FRAMES_DIR):
        sys.exit('assets/frames bulunamadi. Bu script hero-render klasoru icinden calismali.')
    ensure_model()
    model, dev, torch = load_model()
    files = sorted(f for f in os.listdir(FRAMES_DIR)
                   if (f.startswith('f') or f.startswith('m')) and f.endswith('.webp'))
    log(f'{len(files)} kare islenecek. (MPS ile birkac dk; CPU ise daha uzun)')
    for i, f in enumerate(files, 1):
        process(os.path.join(FRAMES_DIR, f), model, dev, torch)
        sys.stdout.write(f'\r  {i}/{len(files)}  {f}      '); sys.stdout.flush()
    log('\nBitti. Simdi: git add assets/frames && git commit -m "Hero: AI detay" && git push')

if __name__ == '__main__':
    main()
