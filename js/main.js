document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Elements
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const closeMenuBtn = document.querySelector('.close-menu-btn');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-menu a');

    // Toggle Mobile Menu Function
    const toggleMenu = () => {
        mobileNavOverlay.classList.toggle('active');
        document.body.style.overflow = mobileNavOverlay.classList.contains('active') ? 'hidden' : '';
    };

    // Event Listeners for Mobile Menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', toggleMenu);
    }

    // Close mobile menu when clicking a link
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Header Scroll Effect
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.padding = '0';
            header.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
        } else {
            header.style.padding = '10px 0';
            header.style.boxShadow = '0 10px 30px -10px rgba(10, 25, 47, 0.15)';
        }
    });

    // Form Submission Handling for Netlify
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            
            const formData = new FormData(contactForm);

            fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(formData).toString()
            })
            .then(() => {
                alert('Grazie! Il tuo messaggio è stato inviato. Ti risponderemo al più presto.');
                contactForm.reset();
            })
            .catch((error) => {
                alert('Oops! C\'è stato un problema nell\'invio del modulo.');
            });
        });
    }

    // Smooth Scrolling for anchor links (fallback for browsers not supporting CSS scroll-behavior)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if(targetElement) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- GALLERY: foto intera al click/tocco ---
    const fotoGallery = document.querySelectorAll('.full-gallery-item');
    if (fotoGallery.length) {
        const lightbox = document.createElement('dialog');
        lightbox.className = 'gallery-lightbox';
        lightbox.innerHTML = '<button type="button" class="gallery-lightbox-close" aria-label="Chiudi"><i class="fas fa-times"></i></button><img alt="">';
        document.body.appendChild(lightbox);
        const fotoGrande = lightbox.querySelector('img');

        fotoGallery.forEach(foto => foto.addEventListener('click', () => {
            fotoGrande.src = foto.currentSrc || foto.src;
            fotoGrande.alt = foto.alt;
            lightbox.showModal();
        }));
        // Si chiude toccando ovunque tranne la foto
        lightbox.addEventListener('click', (e) => {
            if (e.target !== fotoGrande) lightbox.close();
        });
    }

    // --- CAROSELLI SU TELEFONO (corsi, Instagram, testimonianze) ---
    // Su schermi piccoli il CSS rende scorrevoli gli elenchi con data-carousel;
    // qui si aggiungono i pallini che seguono lo scorrimento
    document.querySelectorAll('[data-carousel]').forEach(track => {
        const items = [...track.children];
        if (items.length < 2) return;

        const dots = document.createElement('div');
        dots.className = 'carousel-dots';
        dots.setAttribute('aria-hidden', 'true');
        dots.innerHTML = items.map(() => '<span></span>').join('');
        track.after(dots);

        const aggiorna = () => {
            const passo = items[0].offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
            const allaFine = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
            const attivo = allaFine ? items.length - 1 : Math.round(track.scrollLeft / passo);
            [...dots.children].forEach((d, i) => d.classList.toggle('active', i === attivo));
        };
        track.addEventListener('scroll', aggiorna, { passive: true });
        aggiorna();
    });

    // --- SEZIONE EVENTI E TRASFERTE (Caricamento da JSON) ---
    const yearSelector = document.getElementById('yearSelector');
    const eventsGrid = document.getElementById('eventsGrid');
    const yearStats = document.getElementById('yearStats');
    const eventsEmpty = document.getElementById('eventsEmpty');

    if (yearSelector && eventsGrid) {

        // Badge stato: mappa il valore JSON → etichetta + classe CSS
        const statoConfig = {
            programmato: { label: 'In Programma', cssClass: 'status-programmato', icon: 'fas fa-arrow-right' },
            completato:  { label: 'Completato',   cssClass: 'status-completato',  icon: 'fas fa-check' }
        };

        let allAnni = [];
        let currentAnno = null;

        // Le date arrivano dal pannello come "AAAA-MM-GG"
        const parseData = (s) => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
            return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
        };
        const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

        // "31 maggio 2026", "19–20 settembre 2026", "27 febbraio – 1 marzo 2026";
        // con breve = true i mesi diventano "mag", "set", ...
        const formatPeriodo = (inizio, fine, breve) => {
            const mese = (d) => breve ? MESI[d.getMonth()].slice(0, 3) : MESI[d.getMonth()];
            const giorno = (d) => d.getDate();
            if (!fine || fine <= inizio) return `${giorno(inizio)} ${mese(inizio)} ${inizio.getFullYear()}`;
            if (inizio.getFullYear() !== fine.getFullYear()) {
                return `${giorno(inizio)} ${mese(inizio)} ${inizio.getFullYear()} – ${giorno(fine)} ${mese(fine)} ${fine.getFullYear()}`;
            }
            if (inizio.getMonth() !== fine.getMonth()) {
                return `${giorno(inizio)} ${mese(inizio)} – ${giorno(fine)} ${mese(fine)} ${fine.getFullYear()}`;
            }
            return `${giorno(inizio)}–${giorno(fine)} ${mese(fine)} ${fine.getFullYear()}`;
        };
        const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));

        // Ricava stato, periodo e anno dalle date; il testo libero "periodo" e lo
        // "stato" manuale restano solo per le vecchie trasferte senza date precise
        const normalizzaTrasferta = (t) => {
            const inizio = parseData(t.dataInizio);
            const fine = parseData(t.dataFine) || inizio;
            const oggi = new Date();
            oggi.setHours(0, 0, 0, 0);

            return {
                ...t,
                inizio,
                anno: Number(t.anno) || (inizio ? inizio.getFullYear() : null),
                stato: inizio ? (fine < oggi ? 'completato' : 'programmato') : (t.stato || 'completato'),
                periodo: inizio ? formatPeriodo(inizio, fine, true) : (t.periodo || ''),
                periodoEsteso: inizio ? formatPeriodo(inizio, fine, false) : (t.periodo || '')
            };
        };

        // Raggruppa per anno (decrescente), unendo il riepilogo di ciascun anno
        const raggruppaPerAnno = (data) => {
            const riepiloghi = new Map((data.anni || []).map(a => [Number(a.anno), a.riepilogo || '']));
            const gruppi = new Map();
            (data.trasferte || []).map(normalizzaTrasferta).forEach(t => {
                if (!t.anno) return;
                if (!gruppi.has(t.anno)) gruppi.set(t.anno, []);
                gruppi.get(t.anno).push(t);
            });
            return [...gruppi.entries()]
                .sort((a, b) => b[0] - a[0])
                .map(([anno, eventi]) => ({ anno, riepilogo: riepiloghi.get(anno) || '', eventi }));
        };

        // Foto: sotto c'è la stessa immagine sfocata che fa da sfondo, così una
        // foto verticale si vede intera invece di essere tagliata
        const mediaHTML = (ev, cfg, lazy = true) => ev.cover
            ? `<div class="event-card-media">
                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                   <img class="event-media-bg" src="${escapeHTML(ev.cover)}" alt="" aria-hidden="true"${lazy ? ' loading="lazy"' : ''}>
                   <img class="event-media-img" src="${escapeHTML(ev.cover)}" alt="${escapeHTML(ev.titolo)}"${lazy ? ' loading="lazy"' : ''}>
               </div>`
            : `<div class="event-card-media event-card-media--placeholder">
                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                   <span class="event-cover-placeholder"><i class="fas fa-route"></i></span>
               </div>`;

        // Pulsante verso i risultati ufficiali (solo link http/https)
        const risultatiHTML = (ev, classe, testo = 'Risultati') => /^https?:\/\/\S+$/i.test(ev.risultati || '')
            ? `<a class="${classe}" href="${escapeHTML(ev.risultati)}" target="_blank" rel="noopener">
                   <i class="fas fa-list-ol"></i> ${testo} <i class="fas fa-external-link-alt"></i>
               </a>`
            : '';

        // Se la foto è più "alta" dello spazio che la contiene (es. verticale in
        // una card orizzontale) la mostra intera; altrimenti la lascia riempire
        const adattaFoto = (contenitore) => {
            const media = contenitore.querySelector('.event-card-media');
            const img = contenitore.querySelector('.event-media-img');
            if (!media || !img) return;
            const verifica = () => {
                if (!img.naturalWidth || !media.clientHeight) return;
                const rapportoFoto = img.naturalWidth / img.naturalHeight;
                const rapportoBox = media.clientWidth / media.clientHeight;
                media.classList.toggle('is-contain', rapportoFoto < rapportoBox * 0.85);
            };
            if (img.complete) verifica();
            img.addEventListener('load', verifica);
        };

        // Finestra di dettaglio: foto intera, descrizione completa e nota
        const dettaglio = document.createElement('dialog');
        dettaglio.className = 'event-dialog';
        dettaglio.setAttribute('aria-label', 'Dettaglio trasferta');
        document.body.appendChild(dettaglio);

        dettaglio.addEventListener('click', (e) => {
            // Click fuori dal riquadro (sullo sfondo scuro) o sulla X
            if (e.target === dettaglio || e.target.closest('.event-dialog-close')) dettaglio.close();
        });
        dettaglio.addEventListener('close', () => { document.body.style.overflow = ''; });

        const apriDettaglio = (ev, cfg) => {
            const notaHTML = ev.nota
                ? `<div class="event-footer"><i class="${cfg.icon}"></i> ${escapeHTML(ev.nota)}</div>`
                : '';
            dettaglio.innerHTML = `
                <button type="button" class="event-dialog-close" aria-label="Chiudi"><i class="fas fa-times"></i></button>
                ${mediaHTML(ev, cfg, false)}
                <div class="event-dialog-content">
                    <div class="event-meta">
                        <span class="date-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHTML(ev.luogo)}</span>
                        <span class="date-loc"><i class="fas fa-calendar-alt"></i> ${escapeHTML(ev.periodoEsteso)}</span>
                    </div>
                    <h3>${escapeHTML(ev.titolo)}</h3>
                    <p>${escapeHTML(ev.descrizione).replace(/\n/g, '<br>')}</p>
                    ${notaHTML}
                    ${risultatiHTML(ev, 'btn btn-primary event-dialog-results', 'Vedi i risultati ufficiali')}
                </div>
            `;
            dettaglio.querySelector('.event-card-media')?.classList.add('is-contain');
            document.body.style.overflow = 'hidden';
            dettaglio.showModal();
            dettaglio.scrollTop = 0;
        };

        // Su telefono le card scorrono in orizzontale: sotto c'è "3 / 17" con una barra
        const eventsNav = document.createElement('div');
        eventsNav.className = 'events-nav';
        eventsNav.setAttribute('aria-hidden', 'true');
        eventsNav.innerHTML = '<span class="events-nav-count"></span><span class="events-nav-bar"><span></span></span>';
        eventsGrid.after(eventsNav);

        const aggiornaNav = () => {
            const cards = eventsGrid.children;
            if (!cards.length) return;
            const passo = cards[0].offsetWidth + (parseFloat(getComputedStyle(eventsGrid).columnGap) || 0);
            const allaFine = eventsGrid.scrollLeft >= eventsGrid.scrollWidth - eventsGrid.clientWidth - 2;
            const indice = allaFine ? cards.length - 1 : Math.min(cards.length - 1, Math.round(eventsGrid.scrollLeft / passo));
            eventsNav.querySelector('.events-nav-count').textContent = `${indice + 1} / ${cards.length}`;
            eventsNav.querySelector('.events-nav-bar span').style.width = `${((indice + 1) / cards.length) * 100}%`;
        };
        eventsGrid.addEventListener('scroll', aggiornaNav, { passive: true });

        // Su telefono il riepilogo dell'anno è tagliato a poche righe
        const riepilogoToggle = document.createElement('button');
        riepilogoToggle.type = 'button';
        riepilogoToggle.className = 'year-stats-toggle';
        riepilogoToggle.hidden = true;
        yearStats.after(riepilogoToggle);

        // Su desktop e tablet si vedono le prime trasferte, le altre con "Mostra tutte"
        // (su telefono il carosello le mostra già tutte: il CSS nasconde il pulsante)
        const VISIBILI_DESKTOP = 6;
        const mostraTutte = document.createElement('button');
        mostraTutte.type = 'button';
        mostraTutte.className = 'btn btn-outline events-show-all';
        mostraTutte.hidden = true;
        eventsNav.after(mostraTutte);
        mostraTutte.addEventListener('click', () => {
            const chiuso = eventsGrid.classList.toggle('is-collapsed');
            aggiornaMostraTutte();
            if (chiuso) eventsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        const aggiornaMostraTutte = () => {
            const totale = eventsGrid.children.length;
            mostraTutte.hidden = totale <= VISIBILI_DESKTOP;
            mostraTutte.innerHTML = eventsGrid.classList.contains('is-collapsed')
                ? `Mostra tutte le ${totale} trasferte <i class="fas fa-chevron-down"></i>`
                : 'Mostra meno <i class="fas fa-chevron-up"></i>';
        };
        riepilogoToggle.addEventListener('click', () => {
            const aperto = yearStats.classList.toggle('is-open');
            riepilogoToggle.textContent = aperto ? 'Mostra meno' : 'Leggi tutto';
        });

        const renderEvents = () => {
            eventsGrid.classList.remove('visible');
            yearStats.classList.remove('visible');

            setTimeout(() => {
                const annoData = allAnni.find(a => a.anno === currentAnno);
                const eventi = annoData ? annoData.eventi : [];

                eventsGrid.innerHTML = '';
                eventsGrid.scrollLeft = 0;
                yearStats.classList.remove('is-open');
                riepilogoToggle.textContent = 'Leggi tutto';

                if (eventi.length === 0) {
                    eventsGrid.style.display = 'none';
                    yearStats.style.display = 'none';
                    eventsEmpty.style.display = 'block';
                    eventsNav.hidden = true;
                    riepilogoToggle.hidden = true;
                    mostraTutte.hidden = true;
                } else {
                    eventsGrid.style.display = '';
                    eventsNav.hidden = false;
                    eventsEmpty.style.display = 'none';
                    yearStats.style.display = '';

                    // Riepilogo anno
                    const riepilogo = annoData.riepilogo || '';
                    yearStats.innerHTML = riepilogo;

                    // Ordine: prima le prossime (la più vicina in alto), poi le completate
                    // (la più recente in alto); quelle senza data in fondo
                    const ordinati = [...eventi].sort((a, b) => {
                        const ordine = { programmato: 0, completato: 1 };
                        const diffStato = (ordine[a.stato] ?? 9) - (ordine[b.stato] ?? 9);
                        if (diffStato !== 0) return diffStato;
                        if (!a.inizio || !b.inizio) return (a.inizio ? 0 : 1) - (b.inizio ? 0 : 1);
                        return a.stato === 'programmato' ? a.inizio - b.inizio : b.inizio - a.inizio;
                    });

                    ordinati.forEach(ev => {
                        const cfg = statoConfig[ev.stato] || { label: ev.stato, cssClass: 'status-completato', icon: 'fas fa-circle' };

                        const card = document.createElement('div');
                        card.className = 'event-card';
                        card.setAttribute('role', 'button');
                        card.setAttribute('tabindex', '0');
                        card.setAttribute('aria-haspopup', 'dialog');
                        card.innerHTML = `
                            ${mediaHTML(ev, cfg)}
                            <div class="event-card-content">
                                <div class="event-meta">
                                    <span class="date-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHTML(ev.luogo)}</span>
                                    <span class="date-loc"><i class="fas fa-calendar-alt"></i> ${escapeHTML(ev.periodo)}</span>
                                </div>
                                <h3>${escapeHTML(ev.titolo)}</h3>
                                <p class="event-desc">${escapeHTML(ev.descrizione)}</p>
                                <div class="event-actions">
                                    <span class="event-more">Leggi di più <i class="fas fa-arrow-right"></i></span>
                                    ${risultatiHTML(ev, 'event-results')}
                                </div>
                            </div>
                        `;
                        adattaFoto(card);
                        // Il link ai risultati apre il sito della federazione, non il dettaglio
                        card.addEventListener('click', (e) => {
                            if (!e.target.closest('a')) apriDettaglio(ev, cfg);
                        });
                        card.addEventListener('keydown', (e) => {
                            if (e.target === card && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                apriDettaglio(ev, cfg);
                            }
                        });
                        eventsGrid.appendChild(card);
                    });
                }

                setTimeout(() => {
                    eventsGrid.classList.add('visible');
                    yearStats.classList.add('visible');
                    aggiornaNav();
                    riepilogoToggle.hidden = yearStats.scrollHeight <= yearStats.clientHeight + 2;
                    eventsGrid.classList.add('is-collapsed');
                    aggiornaMostraTutte();
                }, 50);
            }, 300);
        };

        const initTabs = () => {
            yearSelector.innerHTML = '';
            allAnni.forEach((annoObj, idx) => {
                const btn = document.createElement('button');
                btn.className = `year-pill${idx === 0 ? ' active' : ''}`;
                btn.textContent = annoObj.anno;
                btn.setAttribute('data-year', annoObj.anno);
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.year-pill').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    currentAnno = annoObj.anno;
                    renderEvents();
                });
                yearSelector.appendChild(btn);
            });

            if (allAnni.length > 0) {
                currentAnno = allAnni[0].anno;
                renderEvents();
            }
        };

        // Fetch JSON (compatibile GitHub Pages, nessun backend)
        fetch('content/trasferte.json', { cache: 'no-cache' })
            .then(res => {
                if (!res.ok) throw new Error('Impossibile caricare trasferte.json');
                return res.json();
            })
            .then(data => {
                allAnni = raggruppaPerAnno(data);
                initTabs();
            })
            .catch(err => {
                console.warn('Trasferte: ' + err.message);
                eventsGrid.style.display = 'none';
                if (yearStats) yearStats.style.display = 'none';
                if (eventsEmpty) eventsEmpty.style.display = 'block';
            });
    }

    // --- SEZIONE NEWS (Caricamento da JSON e Routing) ---
    const latestNewsGrid = document.getElementById('latestNewsGrid');
    const newsGrid = document.getElementById('newsGrid');
    const yearSelectorNews = document.getElementById('yearSelectorNews');
    const yearStatsNews = document.getElementById('yearStatsNews');
    const newsEmpty = document.getElementById('newsEmpty');
    const newsArchiveView = document.getElementById('newsArchiveView');
    const newsDetailView = document.getElementById('newsDetailView');
    const newsPageHeader = document.getElementById('newsPageHeader');

    // Elenco news scritto nell'HTML: i pulsanti anno mostrano solo le card di quell'anno
    if (yearSelectorNews && yearSelectorNews.hasAttribute('data-statico')) {
        yearSelectorNews.addEventListener('click', (e) => {
            const pill = e.target.closest('.year-pill');
            if (!pill) return;
            yearSelectorNews.querySelectorAll('.year-pill').forEach(p => p.classList.toggle('active', p === pill));
            document.querySelectorAll('#newsGrid > [data-anno], #yearStatsNews > [data-anno]').forEach(el => {
                el.hidden = el.dataset.anno !== pill.dataset.year;
            });
        });
    }

    // Pagina articolo: "Copia link" e "Altro" (menu di condivisione del telefono, da cui c'è anche Instagram)
    document.querySelectorAll('[data-copia-link]').forEach(btn => {
        btn.addEventListener('click', () => {
            const testo = btn.querySelector('span');
            navigator.clipboard.writeText(btn.dataset.copiaLink).then(() => {
                testo.textContent = 'Link copiato!';
                setTimeout(() => { testo.textContent = 'Copia link'; }, 2000);
            }).catch(() => window.prompt('Copia il link:', btn.dataset.copiaLink));
        });
    });
    if (navigator.share) {
        document.querySelectorAll('[data-condividi]').forEach(btn => {
            btn.hidden = false;
            btn.addEventListener('click', () => {
                navigator.share({ title: btn.dataset.condividi, url: location.href.split(/[?#]/)[0] }).catch(() => {});
            });
        });
    }

    if (latestNewsGrid || newsGrid) {
        let rawDataNews = null;

        const getAllNews = (data) => {
            let all = [];
            if (data && data.anni) {
                data.anni.forEach(annoObj => {
                    const list = annoObj.news || annoObj.eventi || [];
                    list.forEach(item => {
                        all.push({
                            ...item,
                            anno: annoObj.anno
                        });
                    });
                });
            }
            return all;
        };

        const createNewsCard = (item, allNewsList) => {
            const card = document.createElement('div');
            card.className = 'news-card';
            
            const coverHTML = item.cover 
                ? `<div class="news-card-media">
                       <img src="${item.cover}" alt="${item.titolo}" loading="lazy">
                   </div>`
                : `<div class="news-card-media news-card-media--placeholder">
                       <span class="news-cover-placeholder"><i class="fas fa-newspaper"></i></span>
                   </div>`;
                   
            card.innerHTML = `
                ${coverHTML}
                <div class="news-card-content">
                    <div class="news-card-meta">
                        <span class="news-date"><i class="far fa-calendar-alt"></i> ${item.data}</span>
                    </div>
                    <h3>${item.titolo}</h3>
                    <p>${item.descrizioneBreve}</p>
                    <a href="news.html?slug=${item.slug}" class="news-card-link">Leggi notizia <i class="fas fa-arrow-right"></i></a>
                </div>
            `;

            const link = card.querySelector('.news-card-link');
            if (link && window.location.pathname.includes('news.html') && allNewsList) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.history.pushState({ slug: item.slug }, '', `news.html?slug=${item.slug}`);
                    renderNewsDetail(item.slug, allNewsList);
                });
            }

            return card;
        };

        const renderNewsDetail = (slug, allNews) => {
            const article = allNews.find(n => n.slug === slug);
            if (!article) {
                showArchiveView();
                return;
            }

            document.getElementById('newsDetailTitle').textContent = article.titolo;
            document.getElementById('newsDetailDate').textContent = article.data;
            document.title = `${article.titolo} | ASD Sport Lab`;

            // Update breadcrumb with truncated title
            const breadcrumbTitle = document.getElementById('breadcrumbTitle');
            if (breadcrumbTitle) {
                const shortTitle = article.titolo.length > 35 
                    ? article.titolo.substring(0, 35) + '…' 
                    : article.titolo;
                breadcrumbTitle.textContent = shortTitle;
            }

            const coverImg = document.getElementById('newsDetailCover');
            if (article.cover) {
                coverImg.src = article.cover;
                coverImg.alt = article.titolo;
                coverImg.style.display = 'block';
            } else {
                coverImg.style.display = 'none';
            }

            const bodyContainer = document.getElementById('newsDetailBody');
            bodyContainer.innerHTML = '';
            const paragraphs = article.descrizioneCompleta.split('\n');
            paragraphs.forEach(pText => {
                const trimmed = pText.trim();
                if (trimmed) {
                    const p = document.createElement('p');
                    p.textContent = trimmed;
                    bodyContainer.appendChild(p);
                }
            });

            const footerContainer = document.getElementById('newsDetailFooter');
            if (article.nota) {
                footerContainer.innerHTML = `<i class="fas fa-info-circle"></i> <span>${article.nota}</span>`;
                footerContainer.style.display = 'flex';
            } else {
                footerContainer.style.display = 'none';
            }

            // Show detail, hide archive — keep main header (#header) always visible
            if (newsArchiveView) newsArchiveView.style.display = 'none';
            if (newsPageHeader) newsPageHeader.style.display = 'none';
            if (newsDetailView) newsDetailView.style.display = 'block';
            
            window.scrollTo({ top: 0, behavior: 'instant' });
        };

        const showArchiveView = () => {
            document.title = 'News & Aggiornamenti | ASD Sport Lab';
            if (newsDetailView) newsDetailView.style.display = 'none';
            if (newsArchiveView) newsArchiveView.style.display = 'block';
            if (newsPageHeader) newsPageHeader.style.display = '';
            window.scrollTo({ top: 0, behavior: 'instant' });
            
            const newUrl = window.location.pathname;
            window.history.pushState({}, '', newUrl);
        };

        // Popstate handler per navigazione avanti/indietro nel browser
        window.addEventListener('popstate', (e) => {
            if (newsGrid) {
                const urlParams = new URLSearchParams(window.location.search);
                const slug = urlParams.get('slug');
                if (slug && rawDataNews) {
                    const allNewsList = getAllNews(rawDataNews);
                    renderNewsDetail(slug, allNewsList);
                } else {
                    if (newsDetailView) newsDetailView.style.display = 'none';
                    if (newsArchiveView) newsArchiveView.style.display = 'block';
                    if (newsPageHeader) newsPageHeader.style.display = '';
                    document.title = 'News & Aggiornamenti | ASD Sport Lab';
                }
            }
        });

        // Pulsanti indietro nella vista dettaglio (breadcrumb + button)
        const backBtn = document.getElementById('backToNewsBtn');
        const backBtnAlt = document.getElementById('backToNewsBtnAlt');
        [backBtn, backBtnAlt].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showArchiveView();
                });
            }
        });

        // Carica dati
        fetch('content/news.json', { cache: 'no-cache' })
            .then(res => {
                if (!res.ok) throw new Error('Impossibile caricare news.json');
                return res.json();
            })
            .then(data => {
                rawDataNews = data;
                const allNewsList = getAllNews(data);

                // 1. Logica per homepage preview
                // Se l'elenco è già scritto nell'HTML (genera_news.py) non si ricostruisce
                if (latestNewsGrid && !latestNewsGrid.hasAttribute('data-statico')) {
                    const previewNews = allNewsList.slice(0, 3);
                    latestNewsGrid.innerHTML = '';
                    previewNews.forEach(item => {
                        const card = createNewsCard(item, null);
                        latestNewsGrid.appendChild(card);
                    });
                    latestNewsGrid.classList.add('visible');
                }

                // 2. Logica per pagina news completa (archivio + dettaglio)
                if (newsGrid && yearSelectorNews && !newsGrid.hasAttribute('data-statico')) {
                    let allAnniNews = (data.anni || []).sort((a, b) => b.anno - a.anno);
                    let currentAnnoNews = allAnniNews.length > 0 ? allAnniNews[0].anno : null;

                    const renderNewsArchive = () => {
                        newsGrid.classList.remove('visible');
                        if (yearStatsNews) yearStatsNews.classList.remove('visible');

                        setTimeout(() => {
                            const annoData = allAnniNews.find(a => a.anno === currentAnnoNews);
                            const newsItems = annoData ? (annoData.news || []) : [];

                            newsGrid.innerHTML = '';

                            if (newsItems.length === 0) {
                                newsGrid.style.display = 'none';
                                if (yearStatsNews) yearStatsNews.style.display = 'none';
                                if (newsEmpty) newsEmpty.style.display = 'block';
                            } else {
                                newsGrid.style.display = 'grid';
                                if (newsEmpty) newsEmpty.style.display = 'none';
                                if (yearStatsNews) {
                                    yearStatsNews.style.display = 'block';
                                    yearStatsNews.innerHTML = annoData.riepilogo || '';
                                }

                                newsItems.forEach(item => {
                                    const card = createNewsCard(item, allNewsList);
                                    newsGrid.appendChild(card);
                                });
                            }

                            setTimeout(() => {
                                newsGrid.classList.add('visible');
                                if (yearStatsNews) yearStatsNews.classList.add('visible');
                            }, 50);
                        }, 300);
                    };

                    const initNewsTabs = () => {
                        yearSelectorNews.innerHTML = '';
                        allAnniNews.forEach((annoObj, idx) => {
                            const btn = document.createElement('button');
                            btn.className = `year-pill${idx === 0 ? ' active' : ''}`;
                            btn.textContent = annoObj.anno;
                            btn.setAttribute('data-year', annoObj.anno);
                            btn.addEventListener('click', () => {
                                document.querySelectorAll('#yearSelectorNews .year-pill').forEach(p => p.classList.remove('active'));
                                btn.classList.add('active');
                                currentAnnoNews = annoObj.anno;
                                renderNewsArchive();
                            });
                            yearSelectorNews.appendChild(btn);
                        });

                        renderNewsArchive();
                    };

                    const urlParams = new URLSearchParams(window.location.search);
                    const slug = urlParams.get('slug');

                    if (slug) {
                        renderNewsDetail(slug, allNewsList);
                    } else {
                        initNewsTabs();
                    }
                }
            })
            .catch(err => {
                console.warn('Errore News: ' + err.message);
                if (latestNewsGrid) latestNewsGrid.innerHTML = '<p class="text-center">Impossibile caricare le ultime news.</p>';
                if (newsGrid) newsGrid.style.display = 'none';
                if (yearStatsNews) yearStatsNews.style.display = 'none';
                if (newsEmpty) newsEmpty.style.display = 'block';
            });
    }
});
