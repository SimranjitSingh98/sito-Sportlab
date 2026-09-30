"""Converte in .webp le foto caricate dal pannello in images/trasferte/.

Ridimensiona a massimo 1600px, corregge l'orientamento delle foto da telefono,
cancella l'originale e aggiorna il percorso nei file JSON di content/.
"""
import re
import unicodedata
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # senza pillow-heif le foto HEIC vengono saltate

CARTELLA = Path('images/trasferte')
CONTENUTI = Path('content')
ESTENSIONI = {'.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'}
LATO_MAX = 1600
QUALITA = 80


def slug(nome):
    nome = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '_', nome.lower()).strip('_') or 'foto'


def destinazione(originale):
    base = slug(originale.stem)
    dest = originale.with_name(base + '.webp')
    n = 2
    while dest.exists() and dest != originale:
        dest = originale.with_name(f'{base}_{n}.webp')
        n += 1
    return dest


def converti(originale):
    dest = destinazione(originale)
    with Image.open(originale) as img:
        # Una webp già piccola e col nome giusto non va ritoccata
        if originale == dest and max(img.size) <= LATO_MAX:
            return None
        img = ImageOps.exif_transpose(img)
        img = img.convert('RGBA' if img.mode in ('RGBA', 'LA', 'P') else 'RGB')
        img.thumbnail((LATO_MAX, LATO_MAX))
        img.save(dest, 'WEBP', quality=QUALITA, method=6)
    if dest != originale:
        originale.unlink()
    return dest


def aggiorna_riferimenti(vecchio, nuovo):
    for json_file in CONTENUTI.glob('*.json'):
        testo = json_file.read_text(encoding='utf-8')
        aggiornato = testo
        for variante in {vecchio.as_posix(), quote(vecchio.as_posix())}:
            aggiornato = aggiornato.replace(f'"{variante}"', f'"{nuovo.as_posix()}"')
            aggiornato = aggiornato.replace(f'"/{variante}"', f'"{nuovo.as_posix()}"')
        if aggiornato != testo:
            json_file.write_text(aggiornato, encoding='utf-8')


def main():
    for file in sorted(CARTELLA.iterdir()):
        if not file.is_file() or file.suffix.lower() not in ESTENSIONI:
            continue
        try:
            nuovo = converti(file)
        except Exception as err:  # una foto rovinata non deve bloccare le altre
            print(f'Saltata {file}: {err}')
            continue
        if nuovo:
            aggiorna_riferimenti(file, nuovo)
            print(f'{file} -> {nuovo}')


if __name__ == '__main__':
    main()
