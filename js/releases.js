// ============================================
// RELEASE CATALOG - Search & Pagination Only
// ============================================
(function() {
    const perPage = 20;
    let currentPage = 1;
    let currentAudio = null;

    function initCatalog() {
        const tiles = document.querySelectorAll('.tile');
        if (tiles.length === 0) return;
        
        // Check if we're on a detail page
        const path = window.location.pathname;
        const match = path.match(/\/releases\/(HYP\d+)\.html/);
        if (match) {
            showDetails(match[1]);
            return;
        }
        
        // Setup search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const query = this.value.trim().toLowerCase();
                tiles.forEach(tile => {
                    const artist = tile.dataset.artist || '';
                    const title = tile.dataset.title || '';
                    const match = artist.includes(query) || title.includes(query);
                    tile.style.display = match ? 'flex' : 'none';
                });
                // Reset to page 1 after search
                currentPage = 1;
                updatePagination();
            });
        }
        
        // Setup page selector
        const pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            const totalPages = Math.ceil(tiles.length / perPage);
            for (let i = 1; i <= totalPages; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                pageSelect.appendChild(opt);
            }
            pageSelect.addEventListener('change', function() {
                currentPage = parseInt(this.value);
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        // Setup pagination clicks
        document.querySelectorAll('.page-num').forEach(el => {
            el.addEventListener('click', function() {
                currentPage = parseInt(this.dataset.page);
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
        
        document.getElementById('prev-page')?.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        document.getElementById('next-page')?.addEventListener('click', function() {
            const totalPages = Math.ceil(tiles.length / perPage);
            if (currentPage < totalPages) {
                currentPage++;
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        
        // Initial pagination
        updatePagination();
    }

    function updatePagination() {
        const tiles = document.querySelectorAll('.tile');
        const visibleTiles = Array.from(tiles).filter(t => t.style.display !== 'none');
        const totalPages = Math.ceil(visibleTiles.length / perPage);
        
        // Show/hide tiles
        tiles.forEach((tile, index) => {
            // Check if tile is visible (not hidden by search)
            if (tile.style.display === 'none') return;
            
            const start = (currentPage - 1) * perPage;
            const end = start + perPage;
            if (index >= start && index < end) {
                tile.style.display = 'flex';
                tile.style.opacity = '0';
                tile.style.transform = 'translateY(15px)';
                setTimeout(() => {
                    tile.style.opacity = '1';
                    tile.style.transform = 'translateY(0)';
                }, 30 + ((index - start) * 60));
            } else {
                tile.style.display = 'none';
            }
        });
        
        // Update page selector
        const pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            pageSelect.value = currentPage;
            // Rebuild options if total pages changed
            const currentTotal = pageSelect.options.length;
            if (currentTotal !== totalPages) {
                pageSelect.innerHTML = '';
                for (let i = 1; i <= totalPages; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = i;
                    if (i === currentPage) opt.selected = true;
                    pageSelect.appendChild(opt);
                }
            }
        }
        
        // Update page numbers
        document.querySelectorAll('.page-num').forEach(el => {
            const page = parseInt(el.dataset.page);
            el.classList.toggle('active', page === currentPage);
        });
        
        // Update arrows
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.style.display = currentPage > 1 ? 'inline' : 'none';
        if (nextBtn) nextBtn.style.display = currentPage < totalPages ? 'inline' : 'none';
    }

    async function showDetails(cat) {
        const detailsView = document.getElementById('details-view');
        const gridView = document.getElementById('grid-view');
        
        if (gridView) gridView.style.display = 'none';
        if (detailsView) {
            detailsView.style.display = 'block';
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();
