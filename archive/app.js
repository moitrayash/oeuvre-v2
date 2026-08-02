(function () {
    'use strict';

    const portfolioData = window.portfolioData;
    if (!portfolioData) {
        // eslint-disable-next-line no-console
        console.error('portfolioData is missing. Ensure portfolioData.js is loaded before app.js.');
        return;
    }

    // ====== NEW ROUTING LOGIC ======

    const workMap = {};
    const flatWorkList = [];
    const categoryIdByName = {};
    const categoryOrder = Object.keys(portfolioData);

    // Slugify category/subsection names for stable fragment identifiers.
    function slugify(value) {
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/['"]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Cache category IDs so we don't recompute on every route change.
    for (const cat of categoryOrder) {
        categoryIdByName[cat] = slugify(cat);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    // Build the workMap and flatWorkList for easy lookup and navigation
    function buildLookups() {
        let index = 0;
        for (const [category, subsections] of Object.entries(portfolioData)) {
            for (const [subsection, works] of Object.entries(subsections)) {
                works.forEach((work) => {
                    // Only add items that have a shortname (i.e., are internal pages)
                    if (work.shortname) {
                        const workData = {
                            ...work, // Spread the original work object
                            category,
                            subsection,
                            index,
                        };

                        workMap[work.shortname] = workData;
                        flatWorkList.push(workData);
                        index++;
                    }
                });
            }
        }
    }

    function showMainPage() {
        document.getElementById('itemPage').classList.remove('active');
        document.getElementById('mainView').classList.remove('hidden');
        document.title = 'Oeuvre';
    }

    function renderNotFound(slug) {
        const itemPage = document.getElementById('itemPage');

        itemPage.innerHTML = `
            <a class="back-link" href="#">← Back to Oeuvre</a>
            <div class="item-header">
                <h1 class="item-title">Work not found</h1>
                <div class="item-date">ID: ${escapeHtml(slug)}</div>
            </div>
            <div class="item-content">
                <p>The page you requested doesn’t exist in this collection yet.</p>
            </div>
        `;

        document.getElementById('itemPage').classList.add('active');
        document.getElementById('mainView').classList.add('hidden');
        window.scrollTo(0, 0);
        document.title = 'Not found — Oeuvre';
    }

    function renderItemPage(workData) {
        const { category, subsection, index } = workData;

        // Find prev/next work from the flat list
        const prevWork = index > 0 ? flatWorkList[index - 1] : null;
        const nextWork = index < flatWorkList.length - 1 ? flatWorkList[index + 1] : null;

        let contentHTML = '';

        // Format content based on category
        if (category === 'Poems') {
            if (Array.isArray(workData.content)) {
                contentHTML = workData.content
                    .map((line) => (line === '' ? '<div class="poem-line">&nbsp;</div>' : `<div class="poem-line">${line}</div>`))
                    .join('');
            } else if (typeof workData.content === 'string') {
                contentHTML = `<div class="poem-line">${workData.content}</div>`;
            }
        } else {
            // This is for "Prose", "Acousmatics", etc.
            if (Array.isArray(workData.content)) {
                contentHTML = workData.content.map((para) => `<p>${para}</p>`).join('');
            } else if (typeof workData.content === 'string') {
                contentHTML = `<p>${workData.content}</p>`;
            }
        }

        // Document title per work (change #2)
        document.title = `${workData.name} — Oeuvre`;

        // Date at the top (if subtext exists)
        const dateHTML = workData.subtext ? `<div class="item-date">${workData.subtext}</div>` : '';

        // Metadata at the bottom
        let metadataHTML = '<div class="item-metadata-section">';
        if (workData.heading) {
            metadataHTML += `<div class="item-meta">${workData.heading}</div>`;
        }
        metadataHTML += `<div class="item-meta">Year: ${workData.year}</div>`;
        metadataHTML += `<div class="item-meta">Category: ${category}</div>`;
        metadataHTML += `<div class="item-meta">Subsection: ${subsection}</div>`;
        if (workData.shortname) {
            metadataHTML += `<div class="item-meta">ID: ${workData.shortname}</div>`;
        }
        metadataHTML += '</div>';

        // Add footnotes if they exist
        let footnotesHTML = '';
        if (workData.footnotes && workData.footnotes.length > 0) {
            footnotesHTML = '<div class="footnotes"><h4>Notes</h4>';
            workData.footnotes.forEach((note) => {
                footnotesHTML += `<p class="footnote">${note}</p>`;
            });
            footnotesHTML += '</div>';
        }

        // Create Previous/Next Navigation HTML
        let navHTML = '<div class="item-page-nav">';

        // Previous Link
        if (prevWork) {
            navHTML += `<a class="back-link" href="#/work/${prevWork.shortname}">← Previous</a>`;
        } else {
            navHTML += '<span class="nav-placeholder"></span>'; // Placeholder to balance flexbox
        }

        // Back Link - now goes to the main page anchor for that category
        const categoryId = categoryIdByName[category];
        navHTML += `<a class="back-link" href="#${categoryId}">← Back to ${category}</a>`;

        // Next Link
        if (nextWork) {
            navHTML += `<a class="back-link" href="#/work/${nextWork.shortname}">Next →</a>`;
        } else {
            navHTML += '<span class="nav-placeholder"></span>'; // Placeholder to balance flexbox
        }

        navHTML += '</div>';

        const itemPageHTML = `
            <a class="back-link" href="#${categoryId}">← Back to ${category}</a>
            <div class="item-header">
                <h1 class="item-title">${workData.name}</h1>
                ${dateHTML}
            </div>
            <div class="item-content">
                ${contentHTML}
            </div>
            ${metadataHTML}
            ${footnotesHTML}
            ${navHTML}
        `;

        document.getElementById('itemPage').innerHTML = itemPageHTML;
        document.getElementById('itemPage').classList.add('active');
        document.getElementById('mainView').classList.add('hidden');
        window.scrollTo(0, 0);
    }

    function handleHashChange() {
        const hash = window.location.hash || '';

        // Check if the hash is for a specific work
        if (hash.startsWith('#/work/')) {
            const slug = hash.substring(7); // Get the part after '#/work/'
            const workData = workMap[slug];

            if (workData) {
                renderItemPage(workData);
            } else {
                // change #3
                renderNotFound(slug);
            }
        } else {
            // If it's any other hash (like '#' or '#poems'), show the main page
            showMainPage();

            // If it's a category anchor, scroll to it
            if (hash.length > 1) {
                const element = document.getElementById(hash.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }

    // ====== ORIGINAL RENDERING FUNCTIONS (Modified) ======

    function renderNavigation() {
        const nav = document.getElementById('mainNav');
        const categories = categoryOrder;

        const navHTML = categories
            .map((cat, i) => {
                const separator = i < categories.length - 1 ? '<span class="nav-separator">|</span>' : '';
                const id = categoryIdByName[cat];
                return `<a href="#${id}">${cat}</a>${separator}`;
            })
            .join('');

        nav.innerHTML = navHTML;
    }

    function renderContent() {
        const main = document.getElementById('mainContent');
        let html = '';

        for (const [category, subsections] of Object.entries(portfolioData)) {
            const categoryId = categoryIdByName[category];
            html += `<section id="${categoryId}">`;
            html += `<h2 class="category-heading">${category}</h2>`;

            for (const [subsection, works] of Object.entries(subsections)) {
                html += `<div class="subsection">`;
                html += `<h3 class="subsection-title">${subsection}</h3>`;
                html += `<ul class="work-list">`;

                works.forEach((work) => {
                    html += `<li class="work-item">`;

                    if (work.externalUrl) {
                        // Render a direct external link
                        html += `<a href="${work.externalUrl}" target="_blank" rel="noopener noreferrer">${work.name}</a>`;
                    } else if (work.shortname) {
                        // Render the internal hash link
                        html += `<a href="#/work/${work.shortname}">${work.name}</a>`;
                    } else {
                        // Fallback for items without a shortname or URL (shouldn't happen for routable items)
                        html += `<span>${work.name}</span>`;
                    }

                    html += `</li>`;
                });

                html += `</ul></div>`;
            }

            html += `</section>`;
        }

        main.innerHTML = html;
    }

    // ====== INITIALIZE PAGE ======
    buildLookups();
    renderNavigation();
    renderContent();

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('load', handleHashChange);

    // Handle initial load immediately (in case load has already fired)
    handleHashChange();
})();

