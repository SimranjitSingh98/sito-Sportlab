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

        const renderEvents = () => {
            eventsGrid.classList.remove('visible');
            yearStats.classList.remove('visible');

            setTimeout(() => {
                const annoData = allAnni.find(a => a.anno === currentAnno);
                const eventi = annoData ? annoData.eventi : [];

                eventsGrid.innerHTML = '';

                if (eventi.length === 0) {
                    eventsGrid.style.display = 'none';
                    yearStats.style.display = 'none';
                    eventsEmpty.style.display = 'block';
                } else {
                    eventsGrid.style.display = 'grid';
                    eventsEmpty.style.display = 'none';
                    yearStats.style.display = 'block';

                    // Riepilogo anno
                    const riepilogo = annoData.riepilogo || '';
                    yearStats.innerHTML = riepilogo;

                    // Ordine: programmato prima, poi completato
                    const ordinati = [...eventi].sort((a, b) => {
                        const ordine = { programmato: 0, completato: 1 };
                        return (ordine[a.stato] ?? 9) - (ordine[b.stato] ?? 9);
                    });

                    ordinati.forEach(ev => {
                        const cfg = statoConfig[ev.stato] || { label: ev.stato, cssClass: 'status-completato', icon: 'fas fa-circle' };
                        const isProgrammato = ev.stato === 'programmato';

                        const coverHTML = ev.cover
                            ? `<div class="event-card-media">
                                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                                   <img src="${ev.cover}" alt="${ev.titolo}" loading="lazy">
                               </div>`
                            : `<div class="event-card-media event-card-media--placeholder">
                                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                                   <span class="event-cover-placeholder"><i class="fas fa-route"></i></span>
                               </div>`;

                        const notaHTML = ev.nota
                            ? `<div class="event-footer"><i class="${cfg.icon}"></i> ${ev.nota}</div>`
                            : '';

                        const card = document.createElement('div');
                        card.className = 'event-card';
                        card.innerHTML = `
                            ${coverHTML}
                            <div class="event-card-content">
                                <div class="event-meta">
                                    <span class="date-loc"><i class="fas fa-map-marker-alt"></i> ${ev.luogo}</span>
                                    <span class="date-loc"><i class="fas fa-calendar-alt"></i> ${ev.periodo}</span>
                                </div>
                                <h3>${ev.titolo}</h3>
                                <p>${ev.descrizione}</p>
                                ${notaHTML}
                            </div>
                        `;
                        eventsGrid.appendChild(card);
                    });
                }

                setTimeout(() => {
                    eventsGrid.classList.add('visible');
                    yearStats.classList.add('visible');
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
        fetch('content/trasferte.json')
            .then(res => {
                if (!res.ok) throw new Error('Impossibile caricare trasferte.json');
                return res.json();
            })
            .then(data => {
                // Ordina per anno decrescente
                allAnni = (data.anni || []).sort((a, b) => b.anno - a.anno);
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

            if (newsArchiveView) newsArchiveView.style.display = 'none';
            if (newsPageHeader) newsPageHeader.style.display = 'none';
            if (newsDetailView) newsDetailView.style.display = 'block';
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const showArchiveView = () => {
            document.title = 'News & Aggiornamenti | ASD Sport Lab';
            if (newsDetailView) newsDetailView.style.display = 'none';
            if (newsArchiveView) newsArchiveView.style.display = 'block';
            if (newsPageHeader) newsPageHeader.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
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
                    if (newsPageHeader) newsPageHeader.style.display = 'block';
                    document.title = 'News & Aggiornamenti | ASD Sport Lab';
                }
            }
        });

        // Pulsante indietro nella vista dettaglio
        const backBtn = document.getElementById('backToNewsBtn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showArchiveView();
            });
        }

        // Carica dati
        fetch('content/news.json')
            .then(res => {
                if (!res.ok) throw new Error('Impossibile caricare news.json');
                return res.json();
            })
            .then(data => {
                rawDataNews = data;
                const allNewsList = getAllNews(data);

                // 1. Logica per homepage preview
                if (latestNewsGrid) {
                    const previewNews = allNewsList.slice(0, 3);
                    latestNewsGrid.innerHTML = '';
                    previewNews.forEach(item => {
                        const card = createNewsCard(item, null);
                        latestNewsGrid.appendChild(card);
                    });
                    latestNewsGrid.classList.add('visible');
                }

                // 2. Logica per pagina news completa (archivio + dettaglio)
                if (newsGrid && yearSelectorNews) {
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
