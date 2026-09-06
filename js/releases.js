// ============================================
// RELEASE CATALOG - Search & Pagination
// ============================================
(function() {
    const perPage = 20;
    let currentPage = 1;
    let allTiles = [];
    let totalPages = 1;
    let searchQuery = '';

    function getPageFromURL() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('page')) || 1;
    }

    function updateURL(page) {
        const url = new URL(window.location);
        if (page === 1) {
            url.searchParams.delete('page');
        } else {
            url.searchParams.set('page', page);
        }
        window.history.pushState({}, '', url);
    }

    function initCatalog() {
        // Get page from URL
        currentPage = getPageFromURL();
        
        allTiles = document.querySelectorAll('.tile');
        if (allTiles.length === 0) {
            console.log('No tiles found');
            return;
        }
        console.log('Found ' + allTiles.length + ' tiles');
        
        // Setup search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchQuery = this.value.trim().toLowerCase();
                currentPage = 1;
                updateURL(currentPage);
                updatePagination();
            });
        }
        
        // Setup page selector
        const pageSelect = document.getElementById('page-select');
        if (pageSelect) {
            pageSelect.addEventListener('change', function() {
                currentPage = parseInt(this.value);
                updateURL(currentPage);
                updatePagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        
        // Setup pagination number clicks
        document.querySelectorAll('.page-num').forEach(function(el) {
            el.addEventListener('click', function() {
                var page = parseInt(this.getAttribute('data-page'));
                if (page && page !== currentPage) {
                    currentPage = page;
                    updateURL(currentPage);
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
                    updateURL(currentPage);
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
                    updateURL(currentPage);
                    updatePagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
        
        // Handle back/forward buttons
        window.addEventListener('popstate', function() {
            currentPage = getPageFromURL();
            updatePagination();
        });
        
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
        
        // Hide all tiles first
        allTiles.forEach(function(tile) {
            tile.style.display = 'none';
        });
        
        // Show tiles for current page
        for (var i = start; i < end; i++) {
            var tile = visibleTiles[i];
            if (tile) {
                tile.style.display = '';
                tile.style.opacity = '0';
                tile.style.transform = 'translateY(15px)';
                tile.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                (function(t, idx) {
                    setTimeout(function() {
                        t.style.opacity = '1';
                        t.style.transform = 'translateY(0)';
                    }, 30 + ((idx - start) * 60));
                })(tile, i);
            }
        }
        
        // Update page selector
        var pageSelect = document.getElementById('page-select');
        if (pageSelect) {
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
        
        console.log('Page ' + currentPage + ' of ' + totalPages);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalog);
    } else {
        initCatalog();
    }
})();
