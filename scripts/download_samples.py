#!/usr/bin/env python3
"""
download_samples.py
Скачивает 3 примера изображений (cat.jpg, street.jpg, dog.jpg) в public/samples/.
Если интернет недоступен — генерирует простые SVG-заглушки с подписями.
"""
import os
import sys
import urllib.request

DEST = "/home/z/my-project/public/samples"
os.makedirs(DEST, exist_ok=True)

# Источники: Picsum (Lorem Picsum) даёт реальные фото по seed.
SOURCES = {
    "cat.jpg": "https://picsum.photos/seed/catdemo/640/480.jpg",
    "street.jpg": "https://picsum.photos/seed/streetdemo/640/480.jpg",
    "dog.jpg": "https://picsum.photos/seed/dogdemo/640/480.jpg",
}


def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r, open(path, "wb") as f:
        f.write(r.read())


def make_placeholder(name, path):
    """SVG-заглушка на случай отсутствия интернета."""
    label = name.replace(".jpg", "")
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#e8f5ef"/>
  <text x="320" y="240" font-family="sans-serif" font-size="48" fill="#369f6e"
        text-anchor="middle" dominant-baseline="middle">[{label}]</text>
  <text x="320" y="290" font-family="sans-serif" font-size="20" fill="#5b6573"
        text-anchor="middle" dominant-baseline="middle">placeholder sample</text>
</svg>"""
    # Сохраняем как .jpg с SVG-содержимым — браузер всё равно отобразит по расширению <img>.
    # Но <img src="*.jpg"> с SVG-внутри не валиден. Конвертируем в настоящий JPEG через PIL, если есть.
    try:
        from PIL import Image
        import io

        # Создаём простое изображение через PIL
        img = Image.new("RGB", (640, 480), color=(232, 245, 239))
        from PIL import ImageDraw, ImageFont

        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 54
            )
            font_sm = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22
            )
        except Exception:
            font = ImageFont.load_default()
            font_sm = ImageFont.load_default()
        draw.text((320, 220), f"[{label}]", fill=(54, 159, 110), anchor="mm", font=font)
        draw.text(
            (320, 285),
            "placeholder sample",
            fill=(91, 101, 115),
            anchor="mm",
            font=font_sm,
        )
        img.save(path, "JPEG", quality=90)
    except ImportError:
        # PIL нет — пишем SVG в файл .jpg (браузер по content-type может не понять, но это фолбэк)
        with open(path, "w") as f:
            f.write(svg)


def main():
    for name, url in SOURCES.items():
        path = os.path.join(DEST, name)
        if os.path.exists(path) and os.path.getsize(path) > 1000:
            print(f"  ✓ уже есть: {name}")
            continue
        try:
            print(f"  ↓ скачиваю: {name} ← {url}")
            download(url, path)
            print(f"    OK ({os.path.getsize(path)} байт)")
        except Exception as e:
            print(f"  ! не удалось скачать {name}: {e}")
            print(f"    генерирую заглушку…")
            make_placeholder(name, path)
            print(f"    заглушка создана ({os.path.getsize(path)} байт)")

    print("\nГотово. Файлы в:", DEST)


if __name__ == "__main__":
    main()
