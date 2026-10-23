"""Adds the recipe photos from the PDF to the recipes JSON made by import-pdf.mjs.

Each photo is matched to the recipe whose title sits to the right of it, re-encoded as JPEG and
stored as a data URL in the recipe's "image" field. Recipes without a photo are left as they are.

Usage: python scripts/attach-pdf-images.py <Przepisy.pdf> <recipes.json> [<output.json>]
Needs PyMuPDF: pip install pymupdf
"""

import json
import re
import sys
import unicodedata
from base64 import b64encode

import pymupdf

JPEG_QUALITY = 75


def normalize(text: str) -> str:
    """Lower case, no diacritics, single spaces: "Rosół, ziemniaki" -> "rosol ziemniaki"."""
    text = unicodedata.normalize('NFD', text.lower()).replace('ł', 'l')
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def main(pdf_path: str, recipes_path: str, out_path: str) -> None:
    doc = pymupdf.open(pdf_path)
    with open(recipes_path, encoding='utf-8') as f:
        recipes = json.load(f)
    names = {r['id']: normalize(r['name']) for r in recipes}
    images: dict[str, bytes] = {}

    for page in doc:
        words = page.get_text('words')  # x0, y0, x1, y1, word, ...
        for img in page.get_images(full=True):
            xref = img[0]
            rect = page.get_image_rects(xref)[0]
            # The title starts to the right of the photo, near its top edge.
            near = sorted(
                (w for w in words if w[0] > rect.x1 - 2 and rect.y0 - 6 <= w[1] <= rect.y0 + 40),
                key=lambda w: (round(w[1]), w[0]),
            )
            text = normalize(' '.join(w[4] for w in near))
            # "Makaron z kurczakiem" is also the start of longer names, so the longest match wins.
            found = sorted(
                (rid for rid, name in names.items() if text.startswith(name) or name.startswith(text[:40])),
                key=lambda rid: -len(names[rid]),
            )
            if not found or found[0] in images:
                print(f'WARNING: page {page.number + 1}: no recipe for photo next to "{text[:60]}"', file=sys.stderr)
                continue
            pix = pymupdf.Pixmap(doc, xref)
            if pix.alpha:
                pix = pymupdf.Pixmap(pix, 0)  # JPEG has no transparency
            images[found[0]] = pix.tobytes('jpg', jpg_quality=JPEG_QUALITY)

    for recipe in recipes:
        if recipe['id'] in images:
            recipe['image'] = 'data:image/jpeg;base64,' + b64encode(images[recipe['id']]).decode('ascii')

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(recipes, f, ensure_ascii=False, indent=2)
        f.write('\n')
    total = sum(len(b) for b in images.values())
    print(f'Photos: {len(images)} of {len(recipes)} recipes, {total / 1024:.0f} KB')


if __name__ == '__main__':
    if len(sys.argv) not in (3, 4):
        sys.exit('Usage: python scripts/attach-pdf-images.py <Przepisy.pdf> <recipes.json> [<output.json>]')
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) == 4 else sys.argv[2])
