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
            
            // Check if we're on a release detail page
            const path = window.location.pathname;
            const match = path.match(/\/releases\/(HYP\d+)\.html/);
            if (match) {
                showDetails(match[1]);
            } else {
                showGrid();
            }
            
            // Still support hash for pagination
            window.addEventListener('hashchange', function() {
                const hash = window.location.hash.substring(1);
                if (hash.startsWith('page-')) {
                    currentPage = parseInt(hash.replace('page-', '')) || 1;
                    showGrid();
                }
            });
            
        } catch (err) {
            console.error("Load Error:", err);
            const grid = document.getElementById('grid');
            if (grid) {
                grid.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">Failed to load releases. Please try again later.</p>';
            }
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
                // Navigate to the actual HTML page
                window.location.href = `/releases/${rel.cat}.html`;
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
            prev.onclick = () => {
                window.location.hash = `page-${currentPage - 1}`;
            };
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
            next.onclick = () => {
                window.location.hash = `page-${currentPage + 1}`;
            };
            nav.appendChild(next);
        }
    }

    async function showDetails(cat) {
        // This is now only called when directly loading a release HTML page
        // The HTML already contains all the details, so we just need to show it
        const detailsView = document.getElementById('details-view');
        const gridView = document.getElementById('grid-view');
        
        if (gridView) gridView.style.display = 'none';
        if (detailsView) {
            detailsView.style.display = 'block';
            // The content is already in the page (loaded from the HTML)
            // We just need to make sure the audio player works
            initAudioPlayer(cat);
        }
    }

    function initAudioPlayer(cat) {
        const artClick = document.getElementById('art-click');
        if (!artClick) return;

        const sampleUrl = `https://cdn.hyperproduction.co.za/samples/${cat}.m4a`;
        const audio = new Audio(sampleUrl);
        const ui = document.getElementById('play-btn-ui');
        const iconPlay = document.getElementById('icon-play');
        const iconPause = document.getElementById('icon-pause');

        audio.oncanplaythrough = () => {
            if (ui) ui.style.display = 'flex';
        };

        audio.onerror = () => {
            if (ui) ui.style.display = 'none';
        };

        // Remove old event listeners by cloning
        const newArtClick = artClick.cloneNode(true);
        artClick.parentNode.replaceChild(newArtClick, artClick);
        
        newArtClick.onclick = () => {
            if (audio.paused) {
                audio.play();
                if (iconPlay) iconPlay.style.display = 'none';
                if (iconPause) iconPause.style.display = 'block';
            } else {
                audio.pause();
                if (iconPlay) iconPlay.style.display = 'block';
                if (iconPause) iconPause.style.display = 'none';
            }
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();
