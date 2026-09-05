// ============================================
// RELEASE CATALOG - Full Functionality
// ============================================
(function() {
    let globalData = [],
        storeLinks = {},
        currentPage = 1,
        currentAudio = null;
    const perPage = 20;

    async function initCatalog() {
        try {
            const [relRes, storeRes] = await Promise.all([
                fetch('/releases.json'),
                fetch('/stores.json')
            ]);

            globalData = await relRes.json();

            if (storeRes.ok) {
                const rawStores = await storeRes.json();
                rawStores.forEach(s => storeLinks[s["Catalogue Number"]] = s);
            }

            globalData.sort((a, b) => b.cat.localeCompare(a.cat));
            window.addEventListener('hashchange', router);
            router();
        } catch (err) {
            console.error("Load Error:", err);
            const grid = document.getElementById('grid');
            if (grid) {
                grid.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">Failed to load releases. Please try again later.</p>';
            }
        }
    }

    function router() {
        const hash = window.location.hash.substring(1);
        if (hash.startsWith('page-')) {
            currentPage = parseInt(hash.replace('page-', '')) || 1;
            showGrid();
        } else if (hash) {
            showDetails(hash);
        } else {
            showGrid();
        }
    }

    function showGrid() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        const detailsView = document.getElementById('details-view');
        const gridView = document.getElementById('grid-view');
        
        if (detailsView) detailsView.style.display = 'none';
        if (gridView) gridView.style.display = 'block';

        const grid = document.getElementById('grid');
        if (!grid) return;
        
        grid.innerHTML = '';

        const start = (currentPage - 1) * perPage;
        const end = Math.min(start + perPage, globalData.length);

        if (globalData.length === 0) {
            grid.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">No releases found.</p>';
            return;
        }

        for (let i = start; i < end; i++) {
            const rel = globalData[i];
            const div = document.createElement('div');
            div.className = 'tile';
            div.onclick = () => {
                window.location.hash = rel.cat;
            };
            div.innerHTML = `
                <img src="https://cdn.hyperproduction.co.za/artworks/${rel.cat}.png" onerror="this.src='https://hyperproduction.co.za/placeholder.png'">
                <div class="tile-info">
                    <p class="artist">${rel.artist}</p>
                    <p class="title">${rel.title}</p>
                </div>
            `;
            grid.appendChild(div);
        }

        renderPagination();
    }

    function renderPagination() {
        const nav = document.getElementById('pagination');
        if (!nav) return;
        
        const total = Math.ceil(globalData.length / perPage);
        nav.innerHTML = '';

        if (total <= 1) return;

        // Previous Arrow
        if (currentPage > 1) {
            const prev = document.createElement('span');
            prev.className = 'page-arrow';
            prev.innerHTML = '&laquo;';
            prev.onclick = () => window.location.hash = `page-${currentPage - 1}`;
            nav.appendChild(prev);
        }

        // Page numbers (max 5)
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(total, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);

        for (let i = start; i <= end; i++) {
            const span = document.createElement('span');
            span.className = 'page-num' + (i === currentPage ? ' active' : '');
            span.innerText = i;
            span.onclick = () => {
                window.location.hash = `page-${i}`;
            };
            nav.appendChild(span);
        }

        // Next Arrow
        if (currentPage < total) {
            const next = document.createElement('span');
            next.className = 'page-arrow';
            next.innerHTML = '&raquo;';
            next.onclick = () => window.location.hash = `page-${currentPage + 1}`;
            nav.appendChild(next);
        }
    }

    async function showDetails(cat) {
        const rel = globalData.find(r => r.cat === cat);
        if (!rel) return;

        window.scrollTo(0, 0);

        const gridView = document.getElementById('grid-view');
        const detailsView = document.getElementById('details-view');
        
        if (gridView) gridView.style.display = 'none';
        if (detailsView) {
            detailsView.style.display = 'block';

            const stores = storeLinks[cat] || {};
            const tracklistHtml = rel.tracks.map((t, i) =>
                `<li><strong>${i+1}.</strong> ${t.artist} - ${t.title} ${t.mix ? '(' + t.mix + ')' : ''}</li>`
            ).join('');

            // FIXED: Samples now use CDN
            const sampleUrl = `https://cdn.hyperproduction.co.za/samples/${cat}.m4a`;

            detailsView.innerHTML = `
                <div class="details-container">
                    <div class="details-left">
                        <div class="left-stack">
                            <div class="art-wrapper" id="art-click">
                                <img src="https://cdn.hyperproduction.co.za/artworks/${rel.cat}.png" class="detail-art" onerror="this.src='https://hyperproduction.co.za/placeholder.png'">
                                <div class="play-overlay" id="play-btn-ui">
                                    <div class="play-icon" id="icon-play"></div>
                                    <div class="pause-icon" id="icon-pause"></div>
                                </div>
                            </div>
                            <div class="hp-stores">
                                ${stores.Traxsource ? `<a href="${stores.Traxsource}" target="_blank"><img src="https://hyperproduction.co.za/logo/stores/traxsource.webp" alt="Traxsource"></a>` : ''}
                                ${stores.Spotify ? `<a href="${stores.Spotify}" target="_blank"><img src="https://hyperproduction.co.za/logo/stores/spotify.webp" alt="Spotify"></a>` : ''}
                                ${stores.Apple ? `<a href="${stores.Apple}" target="_blank"><img src="https://hyperproduction.co.za/logo/stores/apple.webp" alt="Apple Music"></a>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="details-right">
                        <h2>${rel.title}</h2>
                        <h3>${rel.artist}</h3>
                        <p><strong>Catalog:</strong> ${rel.cat}</p>
                        ${rel.genre ? `<p><strong>Genre:</strong> ${rel.genre}</p>` : ''}
                        ${rel.release_date ? `<p><strong>Release Date:</strong> ${rel.release_date}</p>` : ''}
                        <div style="margin-top:30px;">
                            <p><strong>Tracklist:</strong></p>
                            <ol>${tracklistHtml}</ol>
                        </div>
                        <div class="back-btn-container">
                            <button class="back-btn" onclick="window.location.hash='page-${currentPage}'"> &lt; Releases</button>
                        </div>
                    </div>
                </div>
            `;

            // Audio player
            const audio = new Audio(sampleUrl);
            const ui = document.getElementById('play-btn-ui');

            audio.oncanplaythrough = () => {
                if (ui) ui.style.display = 'flex';
            };

            audio.onerror = () => {
                if (ui) ui.style.display = 'none';
            };

            const artClick = document.getElementById('art-click');
            if (artClick) {
                artClick.onclick = () => {
                    if (audio.paused) {
                        audio.play();
                        const iconPlay = document.getElementById('icon-play');
                        const iconPause = document.getElementById('icon-pause');
                        if (iconPlay) iconPlay.style.display = 'none';
                        if (iconPause) iconPause.style.display = 'block';
                        currentAudio = audio;
                    } else {
                        audio.pause();
                        const iconPlay = document.getElementById('icon-play');
                        const iconPause = document.getElementById('icon-pause');
                        if (iconPlay) iconPlay.style.display = 'block';
                        if (iconPause) iconPause.style.display = 'none';
                    }
                };
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();