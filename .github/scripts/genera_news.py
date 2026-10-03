"""Genera le pagine statiche delle news a partire da content/news.json.

- news/<slug>.html          una pagina per articolo: title, description, canonical,
                            Open Graph, JSON-LD Article + BreadcrumbList, testo completo
- images/news/<slug>-og.jpg anteprima social 1200x630 ritagliata (mai deformata)
- news.html e index.html    elenco news scritto nell'HTML, tra i marcatori NEWS-...
- news.html                 redirect dei vecchi link news.html?slug=... alle pagine nuove
- sitemap.xml               tutte le pagine, con lastmod

Si lancia dalla radice del sito: python3 .github/scripts/genera_news.py
"""
import html
import json
import re
import subprocess
from datetime import date, datetime
from pathlib import Path

from PIL import Image, ImageOps

SITO = 'https://asdsportlab.eu'
ORG_ID = f'{SITO}/#organization'
LOGO = f'{SITO}/images/loghi/logoQuadrato512x512.png'
NEWS_JSON = Path('content/news.json')
CARTELLA_PAGINE = Path('news')
CARTELLA_OG = Path('images/news')
OG_W, OG_H = 1200, 630
NEWS_IN_HOME = 3
MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']


def esc(testo):
    return html.escape(testo or '', quote=True)


def data_iso(gg_mm_aaaa):
    return datetime.strptime(gg_mm_aaaa.strip(), '%d/%m/%Y').date()


def data_leggibile(d):
    return f'{d.day} {MESI[d.month - 1]} {d.year}'


def riassunto(news, massimo=155):
    """Occhiello (descrizioneBreve), oppure l'inizio del testo, tagliato su una parola."""
    testo = re.sub(r'\s+', ' ', news.get('descrizioneBreve') or news.get('descrizioneCompleta') or '').strip()
    if len(testo) <= massimo:
        return testo
    return testo[:massimo - 1].rsplit(' ', 1)[0].rstrip(' ,.;:') + '…'


def ha_brand(testo):
    """Vero se il nome dell'associazione c'è già (ASD Sport Lab, Sport Lab, SportLab...)."""
    return 'sportlab' in re.sub(r'[^a-z]', '', (testo or '').lower())


def titolo_pagina(news):
    """<title>: "titolo_seo" se presente (per i titoli lunghi), altrimenti il titolo;
    il nome dell'associazione si aggiunge solo se non c'è già."""
    titolo = (news.get('titolo_seo') or news['titolo']).strip()
    return titolo if ha_brand(titolo) else f'{titolo} | ASD Sport Lab'


def alt_copertina(news):
    """Testo alternativo della copertina: "cover_alt" se presente, altrimenti il titolo."""
    return (news.get('cover_alt') or news['titolo']).strip()


def paragrafi(testo):
    return [p.strip() for p in (testo or '').split('\n') if p.strip()]


def carica_news():
    dati = json.loads(NEWS_JSON.read_text(encoding='utf-8'))
    elenco = []
    for gruppo in dati.get('anni', []):
        for n in gruppo.get('news', []):
            n = dict(n, anno=gruppo['anno'], quando=data_iso(n['data']))
            elenco.append(n)
    elenco.sort(key=lambda n: n['quando'], reverse=True)
    riepiloghi = {g['anno']: g.get('riepilogo', '') for g in dati.get('anni', [])}
    return elenco, riepiloghi


def misure(percorso):
    try:
        with Image.open(percorso) as im:
            return im.size
    except OSError:
        return None


# ── Parti comuni prese da news.html (header, menu mobile, footer) ─────────
def blocchi_comuni():
    s = Path('news.html').read_text(encoding='utf-8')
    header = re.search(r'    <header id="header">.*?</header>', s, re.S).group(0)
    menu = re.search(r'    <div class="mobile-nav-overlay">.*?\n    </div>\n', s, re.S).group(0)
    footer = re.search(r'    <footer class="footer">.*?</footer>', s, re.S).group(0)
    wa = re.search(r'    <a href="[^"]*"\s*class="floating-wa".*?</a>', s, re.S).group(0)
    return [assoluti(b) for b in (header, menu, footer, wa)]


def assoluti(blocco):
    """Le pagine stanno in /news/: i percorsi relativi diventano assoluti dalla radice."""
    blocco = re.sub(r'(href|src)="(?!https?:|#|/|mailto:|tel:)([^"]+)"', r'\1="/\2"', blocco)
    return blocco.replace('href="/index.html#', 'href="/#').replace('href="/index.html"', 'href="/"')


# ── Anteprima social ──────────────────────────────────────────────────────
def crea_og(news):
    """JPG 1200x630 ritagliato al centro (un po' più in alto, dove di solito ci sono i volti)."""
    if not news.get('cover') or not Path(news['cover']).exists():
        return None
    CARTELLA_OG.mkdir(parents=True, exist_ok=True)
    dst = CARTELLA_OG / f"{news['slug']}-og.jpg"
    with Image.open(news['cover']) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        og = ImageOps.fit(im, (OG_W, OG_H), Image.LANCZOS, centering=(0.5, 0.4))
        og.save(dst, 'JPEG', quality=85, optimize=True, progressive=True)
    return dst


# ── Pagina articolo ───────────────────────────────────────────────────────
def pagina_articolo(news, header, menu, footer, wa):
    url = f"{SITO}/news/{news['slug']}.html"
    titolo = news['titolo']
    descr = riassunto(news)
    giorno = news['quando'].isoformat()
    og = crea_og(news)
    og_url = f'{SITO}/{og.as_posix()}' if og else LOGO
    cover = f"/{news['cover']}" if news.get('cover') else ''
    dim = misure(news['cover']) if news.get('cover') else None
    dim_attr = f' width="{dim[0]}" height="{dim[1]}"' if dim else ''

    json_ld = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Article',
                '@id': f'{url}#article',
                'headline': titolo,
                'description': descr,
                'image': [og_url] + ([f'{SITO}{cover}'] if cover else []),
                'datePublished': giorno,
                # Nessun campo "modificato" in news.json: per ora coincide con la pubblicazione
                'dateModified': giorno,
                'author': {'@id': ORG_ID},
                'publisher': {'@id': ORG_ID},
                'mainEntityOfPage': url,
                'inLanguage': 'it-IT',
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': f'{SITO}/'},
                    {'@type': 'ListItem', 'position': 2, 'name': 'News', 'item': f'{SITO}/news.html'},
                    {'@type': 'ListItem', 'position': 3, 'name': titolo, 'item': url},
                ],
            },
            {
                # Ripetuto qui perché Google non risolve gli @id definiti su altre pagine
                '@type': 'SportsOrganization',
                '@id': ORG_ID,
                'name': 'ASD Sport Lab',
                'url': f'{SITO}/',
                'logo': LOGO,
            },
        ],
    }

    corpo = '\n'.join(f'                            <p>{esc(p)}</p>' for p in paragrafi(news.get('descrizioneCompleta')))
    nota = (f'''
                        <footer class="news-detail-footer">
                            <i class="fas fa-info-circle"></i> <span>{esc(news['nota'])}</span>
                        </footer>''' if news.get('nota') else '')
    # Copertine verticali o quasi quadrate (locandine, foto in posa): mostrate intere,
    # perché il ritaglio a 450px di altezza taglierebbe scritte e teste
    intera = ' news-detail-cover-wrapper--intera' if dim and dim[1] > dim[0] * 0.75 else ''
    copertina = (f'''
                        <div class="news-detail-cover-wrapper{intera}">
                            <img src="{esc(cover)}" alt="{esc(alt_copertina(news))}" class="news-detail-cover"{dim_attr}>
                        </div>''' if cover else '')

    return f'''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(titolo_pagina(news))}</title>
    <meta name="description" content="{esc(descr)}">
    <link rel="canonical" href="{url}">

    <!-- Open Graph / Social -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="{esc(titolo)}">
    <meta property="og:description" content="{esc(descr)}">
    <meta property="og:url" content="{url}">
    <meta property="og:image" content="{og_url}">
    <meta property="og:image:width" content="{OG_W if og else 512}">
    <meta property="og:image:height" content="{OG_H if og else 512}">
    <meta property="og:image:alt" content="{esc(alt_copertina(news))}">
    <meta property="og:locale" content="it_IT">
    <meta property="og:site_name" content="ASD Sport Lab">
    <meta property="article:published_time" content="{giorno}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{esc(titolo)}">
    <meta name="twitter:description" content="{esc(descr)}">
    <meta name="twitter:image" content="{og_url}">

    <!-- Font e icone non bloccanti (stesso schema di index.html) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"></noscript>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>

    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/enhanced.css">

    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="48x48" href="/images/loghi/logoQuadrato48x48.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/loghi/logoQuadrato180x180.png">
    <meta name="theme-color" content="#123B63">

    <script type="application/ld+json">
{json.dumps(json_ld, ensure_ascii=False, indent=2)}
    </script>
</head>
<body>
    <!-- Pagina generata da .github/scripts/genera_news.py: non modificarla a mano,
         si rigenera da content/news.json -->

{header}

{menu}
    <section class="section news-main-section news-article-page">
        <div class="container">
            <div class="news-detail-topbar">
                <div class="container">
                    <nav class="news-breadcrumb" aria-label="Breadcrumb">
                        <a href="/"><i class="fas fa-home"></i> Home</a>
                        <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                        <a href="/news.html">News</a>
                        <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                        <span class="breadcrumb-current">{esc(titolo)}</span>
                    </nav>
                    <a href="/news.html" class="btn btn-outline btn-sm"><i class="fas fa-arrow-left"></i> Tutte le News</a>
                </div>
            </div>

            <div class="news-detail-container">
                <article class="news-detail-article">
                    <header class="news-detail-header">
                        <div class="news-detail-meta">
                            <span class="news-detail-date"><i class="far fa-calendar-alt"></i> <time datetime="{giorno}">{data_leggibile(news['quando'])}</time></span>
                        </div>
                        <h1 class="news-detail-title">{esc(titolo)}</h1>
                    </header>
{copertina}

                    <div class="news-detail-body">
{corpo}
                    </div>
{nota}
                </article>

                <div class="news-detail-cta-block">
                    <h3>Ti piacerebbe vivere l'esperienza SportLab?</h3>
                    <p>Scrivici per prenotare una lezione di prova gratuita per tuo figlio o ricevere informazioni dettagliate sui corsi di pattinaggio.</p>
                    <a href="https://wa.me/393454294187?text=Ciao%20ho%20letto%20la%20notizia%20sul%20sito%20e%20vorrei%20maggiori%20informazioni"
                       class="btn btn-cta btn-large shadow" target="_blank" rel="noopener">
                        <i class="fab fa-whatsapp"></i> Scrivici su WhatsApp
                    </a>
                </div>
            </div>
        </div>
    </section>

{footer}

{wa}

    <script src="/js/main.js"></script>
</body>
</html>
'''


# ── Elenchi news in news.html e index.html ────────────────────────────────
def card(news, nascosta=False):
    url = f"/news/{news['slug']}.html"
    dim = misure(news['cover']) if news.get('cover') else None
    dim_attr = f' width="{dim[0]}" height="{dim[1]}"' if dim else ''
    media = (f'''<div class="news-card-media">
                            <img src="{esc(news['cover'])}" alt="{esc(alt_copertina(news))}" loading="lazy"{dim_attr}>
                        </div>''' if news.get('cover') else '''<div class="news-card-media news-card-media--placeholder">
                            <span class="news-cover-placeholder"><i class="fas fa-newspaper"></i></span>
                        </div>''')
    return f'''                    <article class="news-card" data-anno="{news['anno']}"{' hidden' if nascosta else ''}>
                        {media}
                        <div class="news-card-content">
                            <div class="news-card-meta">
                                <span class="news-date"><i class="far fa-calendar-alt"></i> <time datetime="{news['quando'].isoformat()}">{news['data']}</time></span>
                            </div>
                            <h3><a href="{url}">{esc(news['titolo'])}</a></h3>
                            <p>{esc(news.get('descrizioneBreve'))}</p>
                            <a href="{url}" class="news-card-link" aria-hidden="true" tabindex="-1">Leggi notizia <i class="fas fa-arrow-right"></i></a>
                        </div>
                    </article>'''


def sostituisci(testo, nome, contenuto):
    """Rimpiazza quello che sta tra <!-- NOME:INIZIO --> e <!-- NOME:FINE -->."""
    schema = re.compile(rf'(<!-- {nome}:INIZIO[^>]*-->)(.*?)(\s*<!-- {nome}:FINE -->)', re.S)
    if not schema.search(testo):
        raise SystemExit(f'Marcatore {nome} non trovato')
    return schema.sub(lambda m: m.group(1) + '\n' + contenuto + m.group(3), testo)


def aggiorna_elenchi(elenco, riepiloghi):
    anni = sorted({n['anno'] for n in elenco}, reverse=True)
    attivo = anni[0] if anni else None

    s = Path('news.html').read_text(encoding='utf-8')
    pill = '\n'.join(
        f'                            <button class="year-pill{" active" if a == attivo else ""}" data-year="{a}">{a}</button>'
        for a in anni)
    riep = '\n'.join(
        f'                        <p data-anno="{a}"{"" if a == attivo else " hidden"}>{esc(riepiloghi.get(a, ""))}</p>'
        for a in anni)
    cards = '\n'.join(card(n, nascosta=(n['anno'] != attivo)) for n in elenco)
    slug = json.dumps([n['slug'] for n in elenco])
    redirect = f'''    <script>
        // Vecchi link news.html?slug=... → pagina statica dell'articolo
        (function () {{
            var note = {slug};
            var slug = new URLSearchParams(location.search).get('slug');
            if (slug && note.indexOf(slug) !== -1) location.replace('/news/' + slug + '.html');
        }})();
    </script>'''
    s = sostituisci(s, 'NEWS-REDIRECT', redirect)
    s = sostituisci(s, 'NEWS-ANNI', pill)
    s = sostituisci(s, 'NEWS-RIEPILOGO', riep)
    s = sostituisci(s, 'NEWS-ELENCO', cards)
    Path('news.html').write_text(s, encoding='utf-8')

    s = Path('index.html').read_text(encoding='utf-8')
    s = sostituisci(s, 'NEWS-HOME', '\n'.join(card(n) for n in elenco[:NEWS_IN_HOME]))
    Path('index.html').write_text(s, encoding='utf-8')


# ── Sitemap ───────────────────────────────────────────────────────────────
def ultima_modifica(percorso):
    """Data dell'ultimo commit del file; oggi se è modificato e non ancora committato."""
    try:
        modificato = subprocess.run(['git', 'status', '--porcelain', '--', percorso],
                                    capture_output=True, text=True, check=True).stdout.strip()
        if modificato:
            return date.today().isoformat()
        out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', percorso],
                             capture_output=True, text=True, check=True).stdout.strip()
        return out or date.today().isoformat()
    except (OSError, subprocess.CalledProcessError):
        return date.today().isoformat()


def scrivi_sitemap(elenco):
    voci = [
        (f'{SITO}/', ultima_modifica('index.html'), 'weekly', '1.0'),
        (f'{SITO}/news.html', ultima_modifica('news.html'), 'weekly', '0.8'),
        (f'{SITO}/gallery.html', ultima_modifica('gallery.html'), 'monthly', '0.6'),
    ]
    # Per gli articoli conta il contenuto: lastmod = dateModified
    voci += [(f"{SITO}/news/{n['slug']}.html", n['quando'].isoformat(), 'yearly', '0.7') for n in elenco]
    righe = ''.join(f'''  <url>
    <loc>{loc}</loc>
    <lastmod>{mod}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
  </url>
''' for loc, mod, freq, prio in voci)
    Path('sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + righe + '</urlset>\n',
        encoding='utf-8')


def main():
    elenco, riepiloghi = carica_news()
    header, menu, footer, wa = blocchi_comuni()
    CARTELLA_PAGINE.mkdir(exist_ok=True)
    validi = set()
    for n in elenco:
        pagina = CARTELLA_PAGINE / f"{n['slug']}.html"
        pagina.write_text(pagina_articolo(n, header, menu, footer, wa), encoding='utf-8')
        validi.add(pagina.name)
        print(f'Generata {pagina}')
    # Articoli tolti da news.json: si tolgono anche pagina e anteprima social
    for vecchia in CARTELLA_PAGINE.glob('*.html'):
        if vecchia.name not in validi:
            vecchia.unlink()
            print(f'Rimossa {vecchia}')
    slug_validi = {n['slug'] for n in elenco}
    for og in CARTELLA_OG.glob('*-og.jpg'):
        if og.name[:-len('-og.jpg')] not in slug_validi:
            og.unlink()
            print(f'Rimossa {og}')
    aggiorna_elenchi(elenco, riepiloghi)
    scrivi_sitemap(elenco)


if __name__ == '__main__':
    main()
