# Immagini del sito

Ogni cartella corrisponde al punto del sito in cui compaiono le foto.
Nomi dei file: minuscoli, con i trattini, formato `.webp` (lato lungo massimo 2000px).

| Cartella | Cosa contiene | Usata in |
|---|---|---|
| `loghi/` | logo Sport Lab (`sportlab.webp`) e icone quadrate 48/180/512 px (favicon, anteprime social) | tutte le pagine |
| `partner/` | loghi FISR, CONI, Comune | home, sezione partner |
| `home/` | foto delle sezioni della home (hero, missione, valori, agonismo, prova, media, locandine) | `index.html` |
| `corsi/` | una foto per corso (cuccioli, amatori, giovanissimi-esordienti, agonismo, adulti) | `index.html` |
| `pattinaggio-artistico/` | foto della pagina del corso di artistico; in `miniature/` le anteprime quadrate 600px della galleria (al click si apre la foto intera) | `pattinaggio-artistico-salerno.html` |
| `staff/` | foto dello staff, una per persona | `index.html` |
| `galleria/` | foto della pagina galleria | `gallery.html` |
| `news/foto/` | copertine e gallerie degli articoli: `<evento>.webp` oppure `<evento>-01.webp`, `-02`… | `content/news.json` |
| `news/anteprime/` | **generate in automatico** da `.github/scripts/genera_news.py` (anteprime social e miniature): non modificarle a mano | pagine news |
| `trasferte/` | copertine delle trasferte, nome `AAAA-MM-gara-luogo.webp`. Le foto caricate dal pannello Pages CMS finiscono qui e vengono convertite e rinominate in automatico | `content/trasferte.json` |
