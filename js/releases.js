// ============================================
// RELEASE CATALOG - Search & Pagination
// ============================================
(function() {
    const perPage = 20;
    let currentPage = 1;
    let currentAudio = null;
    let allTiles = [];
    let totalPages = 1;
    let searchQuery = '';

    function initCatalog() {
        allTiles = document.querySelectorAll('.tile');
        if (allTiles.length === 0) {
            console.log('No tiles found');
            return;
        }
        console.log('Found ' + allTiles.length + ' tiles');
        
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
                searchQuery = this.value.trim().toLowerCase();
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
        document.querySelectorAll('.page-num').forEach(function(el) {
            el.addEventListener('click', function() {
                var page = parseInt(this.getAttribute('data-page'));
                console.log('Clicked page: ' + page);
                if (page && page !== currentPage) {
                    currentPage = page;
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
        
        // Setup prev button
        var prevBtn = document.getElementById('prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 1) {
                    currentPage--;
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        // Setup next button
        var nextBtn = document.getElementById('next-page');
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
        // Get visible tiles based on search
        var visibleTiles = [];
        allTiles.forEach(function(tile) {
            if (searchQuery) {
                var artist = (tile.dataset.artist || '').toLowerCase();
                var title = (tile.dataset.title || '').toLowerCase();
                if (artist.indexOf(searchQuery) !== -1 || title.indexOf(searchQuery) !== -1) {
                    visibleTiles.push(tile);
                    tile.style.display = '';
                } else {
                    tile.style.display = 'none';
                }
            } else {
                visibleTiles.push(tile);
                tile.style.display = '';
            }
        });
        
        var totalItems = visibleTiles.length;
        totalPages = Math.ceil(totalItems / perPage);
        if (totalPages === 0) totalPages = 1;
        
        // Clamp current page
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        
        // Calculate start and end
        var start = (currentPage - 1) * perPage;
        var end = Math.min(start + perPage, totalItems);
        
        // Hide all tiles first, then show only current page
        allTiles.forEach(function(tile) {
            tile.style.display = 'none';
        });
        
        // Show tiles for current page with animation
        for (var i = start; i < end; i++) {
            var tile = visibleTiles[i];
            if (tile) {
                tile.style.display = '';
                tile.style.opacity = '0';
                tile.style.transform = 'translateY(15px)';
                tile.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                (function(t, index) {
                    setTimeout(function() {
                        t.style.opacity = '1';
                        t.style.transform = 'translateY(0)';
                    }, 30 + ((index - start) * 60));
                })(tile, i);
            }
        }
        
        // Update page selector
        var pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            // Rebuild options if needed
            if (pageSelect.options.length !== totalPages) {
                pageSelect.innerHTML = '';
                for (var i = 1; i <= totalPages; i++) {
                    var opt = document.createElement('option');
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
        var pageNums = document.querySelectorAll('.page-num');
        pageNums.forEach(function(el) {
            var page = parseInt(el.getAttribute('data-page'));
            if (page === currentPage) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
        
        // Update prev/next buttons
        var prevBtn = document.getElementById('prev-page');
        var nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.style.display = currentPage > 1 ? 'inline' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = currentPage < totalPages ? 'inline' : 'none';
        }
        
        console.log('Page ' + currentPage + ' of ' + totalPages + ' (showing ' + (end - start) + ' of ' + totalItems + ' items)');
    }

    async function showDetails(cat) {
        var detailsView = document.getElementById('details-view');
        var gridView = document.getElementById('grid-view');
        
        if (gridView) gridView.style.display = 'none';
        if (detailsView) {
            detailsView.style.display = 'block';
            initAudioPlayer(cat);
        }
    }

    function initAudioPlayer(cat) {
        var artClick = document.getElementById('art-click');
        if (!artClick) return;

        var sampleUrl = 'https://cdn.hyperproduction.co.za/samples/' + cat + '.m4a';
        var audio = new Audio(sampleUrl);
        var ui = document.getElementById('play-btn-ui');
        var iconPlay = document.getElementById('icon-play');
        var iconPause = document.getElementById('icon-pause');

        audio.oncanplaythrough = function() {
            if (ui) ui.style.display = 'flex';
        };

        audio.onerror = function() {
            if (ui) ui.style.display = 'none';
        };

        var newArtClick = artClick.cloneNode(true);
        artClick.parentNode.replaceChild(newArtClick, artClick);
        
        newArtClick.onclick = function() {
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
