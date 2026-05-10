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
                            ? `<div class="event-card-img">
                                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                                   <img src="${ev.cover}" alt="${ev.titolo}" loading="lazy">
                               </div>`
                            : `<div class="event-card-img event-card-img--no-cover">
                                   <span class="event-status ${cfg.cssClass}">${cfg.label}</span>
                                   <div class="event-cover-placeholder"><i class="fas fa-route"></i></div>
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
});
