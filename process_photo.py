from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

src = Path(r"C:\Users\P R A T I K\Desktop\New folder (3)\WhatsApp Image 2025-12-13 at 10.05.23 AM 123.jpeg")
out = Path(r"C:\Users\P R A T I K\Documents\Codex\2026-06-13\built-a-website-of-me-with\outputs\assets\pratik-photo.jpg")

img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")

# Trim solid dark letterbox bands while keeping the office scene intact.
rows = []
for y in range(img.height):
    stat = ImageStat.Stat(img.crop((0, y, img.width, y + 1)))
    rows.append(sum(stat.mean) / 3)

threshold = 12
top = next((i for i, value in enumerate(rows) if value > threshold), 0)
bottom = next((img.height - i for i, value in enumerate(reversed(rows)) if value > threshold), img.height)
img = img.crop((0, top, img.width, bottom))

img = ImageOps.autocontrast(img, cutoff=0.4)
img = ImageEnhance.Color(img).enhance(1.05)
img = ImageEnhance.Contrast(img).enhance(1.06)
img = ImageEnhance.Sharpness(img).enhance(1.08)
img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=3))

out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, "JPEG", quality=88, optimize=True, progressive=True)
print(f"{out} {img.width}x{img.height}")
