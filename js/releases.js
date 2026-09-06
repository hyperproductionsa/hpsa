// ============================================
// RELEASE CATALOG - Search & Pagination
// ============================================
(function() {
    const perPage = 20;
    let currentPage = 1;
    let currentAudio = null;
    let allTiles = [];
    let totalPages = 1;

    function initCatalog() {
        allTiles = document.querySelectorAll('.tile');
        if (allTiles.length === 0) return;
        
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
                allTiles.forEach(tile => {
                    const artist = tile.dataset.artist || '';
                    const title = tile.dataset.title || '';
                    const match = artist.includes(query) || title.includes(query);
                    tile.style.display = match ? '' : 'none';
                });
                currentPage = 1;
                updatePagination();
            });
        }
        
        // Setup page selector
        const pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            pageSelect.addEventListener('change', function() {
                currentPage = parseInt(this.value);
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        // Setup pagination number clicks
        document.querySelectorAll('.page-num').forEach(el => {
            el.addEventListener('click', function() {
                currentPage = parseInt(this.dataset.page);
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
        
        // Setup prev/next buttons
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentPage < totalPages) {
                    currentPage++;
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        // Initial pagination
        updatePagination();
    }

    function updatePagination() {
        // Get visible tiles (not hidden by search)
        const visibleTiles = Array.from(allTiles).filter(t => t.style.display !== 'none');
        const totalItems = visibleTiles.length;
        totalPages = Math.ceil(totalItems / perPage);
        
        // Clamp current page
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        if (totalPages === 0) totalPages = 1;
        
        // Calculate start and end indices
        const start = (currentPage - 1) * perPage;
        const end = Math.min(start + perPage, totalItems);
        
        // Hide all tiles first
        allTiles.forEach(tile => {
            tile.style.display = 'none';
        });
        
        // Show only tiles for current page
        for (let i = start; i < end; i++) {
            const tile = visibleTiles[i];
            if (tile) {
                tile.style.display = '';
                // Add fade animation
                tile.style.opacity = '0';
                tile.style.transform = 'translateY(15px)';
                tile.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                setTimeout(() => {
                    tile.style.opacity = '1';
                    tile.style.transform = 'translateY(0)';
                }, 30 + ((i - start) * 60));
            }
        }
        
        // Update page selector
        const pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            // Rebuild options if needed
            if (pageSelect.options.length !== totalPages) {
                pageSelect.innerHTML = '';
                for (let i = 1; i <= totalPages; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = i;
                    if (i === currentPage) opt.selected = true;
                    pageSelect.appendChild(opt);
                }
            } else {
                pageSelect.value = currentPage;
            }
        }
        
        // Update page number buttons
        document.querySelectorAll('.page-num').forEach(el => {
            const page = parseInt(el.dataset.page);
            el.classList.toggle('active', page === currentPage);
        });
        
        // Update prev/next buttons
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.style.display = currentPage > 1 ? '' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = currentPage < totalPages ? '' : 'none';
        }
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
