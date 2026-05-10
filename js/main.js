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

    // --- SEZIONE EVENTI E TRASFERTE (Archivio Dinamico) ---
    const sportLabEvents = [
        // Eventi Futuri (In Programma)
        {
            year: 2024,
            isFuture: true,
            title: "Campionato Italiano Pista",
            location: "Cassano d'Adda (MI)",
            dateStr: "In Programma",
            image: "images/atleta_in_pista_campionatiitaliani2026.jpg",
            category: "Campionato Italiano",
            description: "Il prossimo grande traguardo! I nostri atleti si stanno allenando intensamente per l'appuntamento più importante dell'anno. Non vediamo l'ora di scendere in pista.",
            footerNote: "Seguici su Instagram per gli aggiornamenti"
        },
        {
            year: 2024,
            isFuture: true,
            title: "Circuito Nord-Ovest",
            location: "San Benedetto del Tronto (AP)",
            dateStr: "Estate 2024",
            image: "images/atleta_sportlab_in_trasferta.JPG",
            category: "Circuito",
            description: "Tappa fondamentale del circuito. Una trasferta che ci vedrà confrontarci con le migliori squadre del centro-nord in una bellissima location sul mare.",
            footerNote: "Gara fondamentale per il ranking"
        },
        // Eventi Passati
        {
            year: 2024,
            isFuture: false,
            title: "Campionato Regionale Sprint",
            location: "Napoli, Campania",
            dateStr: "Marzo 2024",
            image: "images/foto_napoli_regionali_2026.JPG",
            category: "Regionale",
            description: "Sulla storica pista di Napoli, i nostri velocisti hanno dimostrato carattere. Ottima prova per i ragazzi delle categorie G/E alla loro prima vera gara regionale.",
            footerNote: "Tante emozioni per i più piccoli"
        },
        {
            year: 2023,
            isFuture: false,
            title: "Trofeo del Mare",
            location: "Pescara, Abruzzo",
            dateStr: "Maggio 2023",
            image: "images/podio_trofeo_pollenza.JPG",
            category: "Trofeo Nazionale",
            description: "Trasferta entusiasmante sulla costa adriatica. Due giorni intensi di gare su pista dove abbiamo portato a casa ottimi piazzamenti e condiviso bellissimi momenti in spiaggia.",
            footerNote: "Oltre la gara, un weekend di squadra"
        },
        {
            year: 2023,
            isFuture: false,
            title: "Internazionali d'Italia",
            location: "L'Aquila, Abruzzo",
            dateStr: "Aprile 2023",
            image: "images/atleti_agonisti_a_benevento.png",
            category: "Gara Internazionale",
            description: "Confronto di altissimo livello su una delle piste più prestigiose d'Italia. I nostri atleti hanno dimostrato determinazione confrontandosi con atleti da tutta Europa.",
            footerNote: "Test importante per il gruppo agonisti"
        },
        {
            year: 2022,
            isFuture: false,
            title: "Campionato Nazionale",
            location: "Roma, Lazio",
            dateStr: "Giugno 2022",
            image: "images/podio_roma_2025.JPG",
            category: "Campionato Nazionale",
            description: "Una grandissima emozione per i nostri ragazzi gareggiare nella Capitale contro i migliori d'Italia. Molti podi conquistati e un'esperienza formativa indimenticabile.",
            footerNote: "Il consolidamento del nostro gruppo"
        }
    ];

    const yearSelector = document.getElementById('yearSelector');
    const eventsGrid = document.getElementById('eventsGrid');
    const yearStats = document.getElementById('yearStats');
    const eventsEmpty = document.getElementById('eventsEmpty');

    if (yearSelector && eventsGrid) {
        // Estrai anni unici e ordinali decrescenti
        const years = [...new Set(sportLabEvents.map(e => e.year))].sort((a, b) => b - a);
        
        let currentYear = years.length > 0 ? years[0] : new Date().getFullYear();

        // Genera i Pill per gli anni
        years.forEach(year => {
            const btn = document.createElement('button');
            btn.className = `year-pill ${year === currentYear ? 'active' : ''}`;
            btn.textContent = year;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.year-pill').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                currentYear = year;
                renderEvents();
            });
            yearSelector.appendChild(btn);
        });

        const renderEvents = () => {
            // Animazione uscita
            eventsGrid.classList.remove('visible');
            yearStats.classList.remove('visible');
            
            setTimeout(() => {
                const filteredEvents = sportLabEvents.filter(e => e.year === currentYear);
                
                // Ordina: Prima i futuri, poi i passati
                filteredEvents.sort((a, b) => {
                    if (a.isFuture === b.isFuture) return 0;
                    return a.isFuture ? -1 : 1;
                });

                eventsGrid.innerHTML = '';
                
                if (filteredEvents.length === 0) {
                    eventsGrid.style.display = 'none';
                    yearStats.style.display = 'none';
                    eventsEmpty.style.display = 'block';
                } else {
                    eventsGrid.style.display = 'grid';
                    eventsEmpty.style.display = 'none';
                    yearStats.style.display = 'block';
                    
                    // Calcolo Stats
                    const uniqueCities = new Set(filteredEvents.map(e => e.location.split(',')[0].trim())).size;
                    const statsText = `Nel ${currentYear} la squadra è stata protagonista in <span>${filteredEvents.length} eventi</span> in <span>${uniqueCities} ${uniqueCities === 1 ? 'città' : 'città'} diverse</span>.`;
                    yearStats.innerHTML = statsText;

                    filteredEvents.forEach(ev => {
                        const card = document.createElement('div');
                        card.className = 'event-card';
                        
                        const statusBadge = ev.isFuture 
                            ? `<div class="event-status">In Programma</div>` 
                            : '';

                        card.innerHTML = `
                            <div class="event-card-img">
                                ${statusBadge}
                                <img src="${ev.image}" alt="${ev.title}">
                            </div>
                            <div class="event-card-content">
                                <div class="event-meta">
                                    <span class="badge-event">${ev.category}</span>
                                    <span class="date-loc"><i class="fas fa-map-marker-alt"></i> ${ev.location} &bull; ${ev.dateStr}</span>
                                </div>
                                <h3>${ev.title}</h3>
                                <p>${ev.description}</p>
                                ${ev.footerNote ? `<div class="event-footer">${ev.isFuture ? '<i class="fas fa-arrow-right"></i>' : '<i class="fas fa-check"></i>'} ${ev.footerNote}</div>` : ''}
                            </div>
                        `;
                        eventsGrid.appendChild(card);
                    });
                }
                
                // Animazione entrata
                setTimeout(() => {
                    eventsGrid.classList.add('visible');
                    yearStats.classList.add('visible');
                }, 50);
                
            }, 300); // Wait for fade out
        };

        // Inizializza
        renderEvents();
    }
});
