"""Genera le pagine statiche delle news a partire da content/news.json.

- news/<slug>.html          una pagina per articolo: title, description, canonical,
                            Open Graph, JSON-LD Article + BreadcrumbList, testo completo
                            (righe "## " = sottotitoli, [testo](url) = link),
                            galleria foto ("galleria" in news.json), pulsanti di condivisione
- images/news/anteprime/<slug>-og.jpg    anteprima social 1200x630 ritagliata (mai deformata)
- images/news/anteprime/<slug>-card.webp miniatura leggera della copertina per le card degli elenchi
- images/news/anteprime/<slug>-cover.webp copertina dell'articolo ridotta (la foto originale resta nello srcset)
- images/news/miniature/<nome>.webp      miniature delle foto in galleria (al click si apre l'originale)
  (le foto da cui partono, copertine e gallerie, stanno in images/news/foto/)
- news.html e index.html    elenco news scritto nell'HTML, tra i marcatori NEWS-...
- news.html                 redirect dei vecchi link news.html?slug=... alle pagine nuove
- 404.html                  pagina per gli indirizzi inesistenti (menu, pulsanti utili, ultime news)
- sitemap.xml               tutte le pagine, con lastmod

Si lancia dalla radice del sito: python3 .github/scripts/genera_news.py
"""
import html
import json
import re
import subprocess
from urllib.parse import quote
from datetime import date, datetime
from pathlib import Path

from PIL import Image, ImageOps

SITO = 'https://asdsportlab.eu'
ORG_ID = f'{SITO}/#organization'
LOGO = f'{SITO}/images/loghi/sportlab-512.png'
NEWS_JSON = Path('content/news.json')
CARTELLA_PAGINE = Path('news')
CARTELLA_OG = Path('images/news/anteprime')
OG_W, OG_H = 1200, 630
# Larghezza delle miniature: la card più grande (prima news su telefono) è ~360px, x2 per gli schermi retina
CARD_W = 720
# Copertina dell'articolo: la colonna è 780px, 1200 basta anche per i telefoni retina
COVER_W = 1200
# Miniature della galleria: 3 colonne in 780px (o 2 sul telefono), ~600px coprono anche i retina
CARTELLA_MINIATURE = Path('images/news/miniature')
MINI_W = 600
PAROLE_AL_MINUTO = 200
NEWS_CORRELATE = 3
NEWS_IN_HOME = 3
MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
        'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']


def esc(testo):
    return html.escape(testo or '', quote=True)


# Link nel testo degli articoli: [testo](url)
LINK = re.compile(r'\[([^\]]+)\]\(([^)\s]+)\)')


def senza_link(testo):
    return LINK.sub(r'\1', testo or '')


def con_link(testo):
    """Testo escapato in cui [testo](url) diventa un <a>; i link esterni si aprono in un'altra scheda."""
    pezzi, inizio = [], 0
    for m in LINK.finditer(testo):
        url = m.group(2)
        esterno = ' target="_blank" rel="noopener"' if url.startswith('http') else ''
        pezzi.append(esc(testo[inizio:m.start()]))
        pezzi.append(f'<a href="{esc(url)}"{esterno}>{esc(m.group(1))}</a>')
        inizio = m.end()
    return ''.join(pezzi) + esc(testo[inizio:])


def data_iso(gg_mm_aaaa):
    return datetime.strptime(gg_mm_aaaa.strip(), '%d/%m/%Y').date()


def data_leggibile(d):
    return f'{d.day} {MESI[d.month - 1]} {d.year}'


def riassunto(news, massimo=155):
    """Occhiello (descrizioneBreve), oppure l'inizio del testo, tagliato su una parola."""
    testo = news.get('descrizioneBreve') or '\n'.join(
        p for p in paragrafi(news.get('descrizioneCompleta')) if not p.startswith('## '))
    testo = re.sub(r'\s+', ' ', senza_link(testo)).strip()
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


def stile_copertina(news):
    """"cover_y" (0 = in alto, 1 = in basso) sposta il ritaglio della copertina
    nelle card e nell'articolo, per le foto con i volti vicino al bordo."""
    if news.get('cover_y') is None:
        return ''
    return f' style="object-position: 50% {float(news["cover_y"]) * 100:g}%"'


def minuti_lettura(news):
    parole = len(re.findall(r'\w+', senza_link(news.get('descrizioneCompleta'))))
    return max(1, round(parole / PAROLE_AL_MINUTO))


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
    """JPG 1200x630 ritagliato al centro (un po' più in alto, dove di solito ci sono i volti,
    oppure all'altezza indicata da "cover_y")."""
    if not news.get('cover') or not Path(news['cover']).exists():
        return None
    CARTELLA_OG.mkdir(parents=True, exist_ok=True)
    dst = CARTELLA_OG / f"{news['slug']}-og.jpg"
    with Image.open(news['cover']) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        og = ImageOps.fit(im, (OG_W, OG_H), Image.LANCZOS, centering=(0.5, float(news.get('cover_y', 0.4))))
        og.save(dst, 'JPEG', quality=85, optimize=True, progressive=True)
    return dst


def riduci(src, dst, larghezza, qualita=78):
    """WebP largo al massimo "larghezza" (mai ingrandito). Restituisce (percorso, larghezza, altezza)."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert('RGB')
        if im.width > larghezza:
            im = im.resize((larghezza, round(im.height * larghezza / im.width)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=qualita, method=6)
        return dst.as_posix(), im.width, im.height


def crea_miniatura(news):
    """WebP largo CARD_W per le card: la copertina originale (anche 2400px) pesa troppo
    per una miniatura, soprattutto sul telefono."""
    if not news.get('cover') or not Path(news['cover']).exists():
        return None
    return riduci(news['cover'], CARTELLA_OG / f"{news['slug']}-card.webp", CARD_W)


def crea_copertina(news):
    """WebP largo COVER_W per la copertina dell'articolo (è l'immagine più grande della pagina)."""
    if not news.get('cover') or not Path(news['cover']).exists():
        return None
    return riduci(news['cover'], CARTELLA_OG / f"{news['slug']}-cover.webp", COVER_W, qualita=80)


def miniatura_galleria(src):
    """Miniatura di una foto della galleria; i nomi in images/news/foto/ sono già unici."""
    if not Path(src).exists():
        return None
    return riduci(src, CARTELLA_MINIATURE / f'{Path(src).stem}.webp', MINI_W)


# ── Pagina articolo ───────────────────────────────────────────────────────
def pagina_articolo(news, elenco, header, menu, footer, wa):
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

    # Una riga che inizia con "## " diventa un sottotitolo <h2>, le altre sono paragrafi
    corpo = '\n'.join(
        f'                            <h2>{esc(p[3:])}</h2>' if p.startswith('## ')
        else f'                            <p>{con_link(p)}</p>'
        for p in paragrafi(news.get('descrizioneCompleta')))
    nota = (f'''
                        <footer class="news-detail-footer">
                            <i class="fas fa-info-circle"></i> <span>{esc(news['nota'])}</span>
                        </footer>''' if news.get('nota') else '')
    # Galleria: elenco di {"src", "alt"}; nella griglia la miniatura, al click la foto
    # intera (js/main.js apre il link)
    foto = []
    for f in news.get('galleria') or []:
        mini = miniatura_galleria(f['src'])
        if mini:
            src, d = mini[0], mini[1:]
        else:
            src, d = f['src'], misure(f['src'])
        d_attr = f' width="{d[0]}" height="{d[1]}"' if d else ''
        foto.append(f'''                            <a href="/{esc(f["src"])}" class="news-gallery-link">
                                <img src="/{esc(src)}" alt="{esc(f.get("alt") or titolo)}" class="news-gallery-item" loading="lazy"{d_attr}>
                            </a>''')
    galleria = (f'''
                    <section class="news-gallery" aria-label="Foto">
                        <h2 class="news-gallery-title">Le foto della giornata</h2>
                        <div class="news-gallery-grid">
{chr(10).join(foto)}
                        </div>
                    </section>''' if foto else '')
    # Copertine verticali o quasi quadrate (locandine, foto in posa): mostrate intere,
    # perché il ritaglio a 450px di altezza taglierebbe scritte e teste
    intera = ' news-detail-cover-wrapper--intera' if dim and dim[1] > dim[0] * 0.75 else ''
    # Link di condivisione: funzionano anche senza JavaScript. Instagram non ha un link
    # di condivisione per il web: ci si arriva dal pulsante "Altro" (menu del telefono)
    u, t = quote(url, safe=''), quote(titolo, safe='')
    condividi = f'''
                    <div class="news-share">
                        <span class="news-share-label"><i class="fas fa-share-alt"></i> Condividi</span>
                        <div class="news-share-buttons">
                            <a href="https://wa.me/?text={t}%20{u}" class="news-share-btn news-share-btn--wa" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> WhatsApp</a>
                            <a href="https://www.facebook.com/sharer/sharer.php?u={u}" class="news-share-btn news-share-btn--fb" target="_blank" rel="noopener"><i class="fab fa-facebook-f"></i> Facebook</a>
                            <a href="https://t.me/share/url?url={u}&amp;text={t}" class="news-share-btn news-share-btn--tg" target="_blank" rel="noopener"><i class="fab fa-telegram-plane"></i> Telegram</a>
                            <button type="button" class="news-share-btn" data-copia-link="{url}"><i class="fas fa-link"></i> <span>Copia link</span></button>
                            <button type="button" class="news-share-btn news-share-btn--altro" data-condividi="{esc(titolo)}" hidden><i class="fas fa-ellipsis-h"></i> Altre app</button>
                        </div>
                    </div>'''
    # Altre notizie (le più recenti) da leggere dopo l'articolo
    altre = [n for n in elenco if n['slug'] != news['slug']][:NEWS_CORRELATE]
    correlate = (f'''

            <section class="news-related" aria-labelledby="altre-notizie">
                <div class="news-related-head">
                    <h2 id="altre-notizie">Altre notizie</h2>
                    <a href="/news.html" class="news-related-all">Vedi tutte <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="news-grid visible">
{chr(10).join(card(n, radice='/') for n in altre)}
                </div>
            </section>''' if altre else '')
    # Copertina: il browser sceglie la versione giusta per lo schermo (card, ridotta o originale)
    cover_src, srcset = cover, ''
    ridotta = crea_copertina(news) if dim and dim[0] > COVER_W else None
    if ridotta:
        mini = news.get('miniatura')
        varianti = ([f'/{mini[0]} {mini[1]}w'] if mini and mini[1] < ridotta[1] else []) + [
            f'/{ridotta[0]} {ridotta[1]}w', f'{cover} {dim[0]}w']
        cover_src = f'/{ridotta[0]}'
        srcset = f' srcset="{esc(", ".join(varianti))}" sizes="(max-width: 820px) 100vw, 780px"'
    copertina = (f'''
                        <div class="news-detail-cover-wrapper{intera}">
                            <img src="{esc(cover_src)}"{srcset} alt="{esc(alt_copertina(news))}" class="news-detail-cover" fetchpriority="high"{dim_attr}{stile_copertina(news)}>
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
    <link rel="icon" type="image/png" sizes="48x48" href="/images/loghi/sportlab-48.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/loghi/sportlab-180.png">
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
                            <span class="news-detail-reading"><i class="far fa-clock"></i> {minuti_lettura(news)} min di lettura</span>
                        </div>
                        <h1 class="news-detail-title">{esc(titolo)}</h1>
                    </header>
{copertina}

                    <div class="news-detail-body">
{corpo}
                    </div>{galleria}
{nota}
{condividi}
                </article>

                <div class="news-detail-cta-block">
                    <h3>Ti piacerebbe vivere l'esperienza SportLab?</h3>
                    <p>Scrivici per prenotare una lezione di prova gratuita per tuo figlio o ricevere informazioni dettagliate sui corsi di pattinaggio.</p>
                    <a href="https://wa.me/393454294187?text=Ciao%20ho%20letto%20la%20notizia%20sul%20sito%20e%20vorrei%20maggiori%20informazioni"
                       class="btn btn-cta btn-large shadow" target="_blank" rel="noopener">
                        <i class="fab fa-whatsapp"></i> Scrivici su WhatsApp
                    </a>
                </div>
            </div>{correlate}
        </div>
    </section>

{footer}

{wa}

    <script src="/js/main.js"></script>
</body>
</html>
'''


# ── Pagina 404 ────────────────────────────────────────────────────────────
def pagina_404(elenco, header, menu, footer, wa):
    """GitHub Pages la mostra per ogni indirizzo inesistente, a qualsiasi profondità:
    per questo tutti i percorsi sono assoluti. Chi arriva da un link rotto trova
    menu, pulsanti utili e le ultime notizie invece della pagina generica di GitHub."""
    header = header.replace(' class="nav-link-active"', '')
    ultime = '\n'.join(card(n, radice='/') for n in elenco[:NEWS_IN_HOME])
    notizie = (f'''

    <section class="section news-main-section">
        <div class="container">
            <div class="news-grid visible">
{ultime}
            </div>
        </div>
    </section>''' if ultime else '')
    return f'''<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagina non trovata | ASD Sport Lab</title>
    <meta name="robots" content="noindex, follow">

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
    <link rel="icon" type="image/png" sizes="48x48" href="/images/loghi/sportlab-48.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/images/loghi/sportlab-180.png">
    <meta name="theme-color" content="#123B63">
</head>
<body>
    <!-- Pagina generata da .github/scripts/genera_news.py: non modificarla a mano -->

{header}

{menu}
    <section class="news-page-hero">
        <div class="container">
            <div class="news-hero-badge"><i class="fas fa-compass"></i> Errore 404</div>
            <h1>Pagina <span class="text-accent">non trovata</span></h1>
            <p class="lead">La pagina che cerchi non esiste o è stata spostata. Da qui puoi tornare in pista:</p>
            <div class="pagina-404-azioni">
                <a href="/" class="btn btn-primary"><i class="fas fa-home"></i> Vai alla Home</a>
                <a href="/#prova" class="btn btn-outline"><i class="fas fa-skating"></i> Prova gratuita</a>
                <a href="/news.html" class="btn btn-outline"><i class="fas fa-newspaper"></i> Tutte le News</a>
            </div>
        </div>
    </section>{notizie}

{footer}

{wa}

    <script src="/js/main.js"></script>
</body>
</html>
'''


# ── Elenchi news in news.html e index.html ────────────────────────────────
def card(news, nascosta=False, radice='', subito=False):
    """Card di un elenco. "radice" = '/' per le pagine dentro /news/;
    "subito" per la prima card visibile appena si apre la pagina (niente lazy loading)."""
    url = f"/news/{news['slug']}.html"
    mini = news.get('miniatura')
    if mini:
        src, dim = mini[0], mini[1:]
    else:
        src = news.get('cover')
        dim = misure(src) if src else None
    dim_attr = f' width="{dim[0]}" height="{dim[1]}"' if dim else ''
    caricamento = ' fetchpriority="high"' if subito else ' loading="lazy"'
    media = (f'''<div class="news-card-media">
                            <img src="{radice}{esc(src)}" alt="{esc(alt_copertina(news))}"{caricamento}{dim_attr}{stile_copertina(news)}>
                        </div>''' if news.get('cover') else '''<div class="news-card-media news-card-media--placeholder">
                            <span class="news-cover-placeholder"><i class="fas fa-newspaper"></i></span>
                        </div>''')
    return f'''                    <article class="news-card" data-anno="{news['anno']}"{' hidden' if nascosta else ''}>
                        {media}
                        <div class="news-card-content">
                            <div class="news-card-meta">
                                <span class="news-date"><i class="far fa-calendar-alt"></i> <time datetime="{news['quando'].isoformat()}">{data_leggibile(news['quando'])}</time></span>
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
    cards = '\n'.join(card(n, nascosta=(n['anno'] != attivo), subito=(i == 0)) for i, n in enumerate(elenco))
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
        (f'{SITO}/pattinaggio-artistico-salerno.html', ultima_modifica('pattinaggio-artistico-salerno.html'), 'monthly', '0.9'),
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
        n['miniatura'] = crea_miniatura(n)
    for n in elenco:
        pagina = CARTELLA_PAGINE / f"{n['slug']}.html"
        pagina.write_text(pagina_articolo(n, elenco, header, menu, footer, wa), encoding='utf-8')
        validi.add(pagina.name)
        print(f'Generata {pagina}')
    # Articoli tolti da news.json: si tolgono anche pagina, anteprima social e miniatura
    for vecchia in CARTELLA_PAGINE.glob('*.html'):
        if vecchia.name not in validi:
            vecchia.unlink()
            print(f'Rimossa {vecchia}')
    slug_validi = {n['slug'] for n in elenco}
    for suffisso in ('-og.jpg', '-card.webp', '-cover.webp'):
        for img in CARTELLA_OG.glob(f'*{suffisso}'):
            if img.name[:-len(suffisso)] not in slug_validi:
                img.unlink()
                print(f'Rimossa {img}')
    # Miniature di foto tolte dalle gallerie
    in_galleria = {Path(f['src']).stem for n in elenco for f in n.get('galleria') or []}
    for img in CARTELLA_MINIATURE.glob('*.webp'):
        if img.stem not in in_galleria:
            img.unlink()
            print(f'Rimossa {img}')
    aggiorna_elenchi(elenco, riepiloghi)
    Path('404.html').write_text(pagina_404(elenco, header, menu, footer, wa), encoding='utf-8')
    scrivi_sitemap(elenco)


if __name__ == '__main__':
    main()
