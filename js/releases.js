// ============================================
// RELEASE CATALOG - Search & Pagination
// ============================================
(function() {
    const perPage = 20;
    let currentPage = 1;
    let allReleases = [];
    let filteredReleases = [];
    let totalPages = 1;
    let searchQuery = '';
    let maxCatalogWithStore = 0;

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

    async function initCatalog() {
        try {
            // Fetch both JSON files
            const [releasesRes, storesRes] = await Promise.all([
                fetch('/releases.json'),
                fetch('/stores.json')
            ]);

            const allReleasesData = await releasesRes.json();
            
            // Get max catalog from stores
            if (storesRes.ok) {
                const storesData = await storesRes.json();
                storesData.forEach(function(store) {
                    const cat = store["Catalogue Number"];
                    if (cat && cat.startsWith('HYP')) {
                        const num = parseInt(cat.replace('HYP', ''));
                        if (num > maxCatalogWithStore) {
                            maxCatalogWithStore = num;
                        }
                    }
                });
                console.log('📊 Max catalog with store links: HYP' + String(maxCatalogWithStore).padStart(3, '0'));
            }

            // Filter releases: only those that have store links
            allReleases = allReleasesData.filter(function(rel) {
                const num = parseInt(rel.cat.replace('HYP', ''));
                return num <= maxCatalogWithStore;
            });

            console.log('📄 Showing ' + allReleases.length + ' releases (up to HYP' + String(maxCatalogWithStore).padStart(3, '0') + ')');
            
            // Sort by catalog number (newest first)
            allReleases.sort(function(a, b) {
                return b.cat.localeCompare(a.cat);
            });
            
            filteredReleases = [...allReleases];
            
            // Get page from URL
            currentPage = getPageFromURL();
            
            // Build the grid
            buildGrid();
            
            // Setup search
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    searchQuery = this.value.trim().toLowerCase();
                    currentPage = 1;
                    updateURL(currentPage);
                    buildGrid();
                });
            }
            
            // Setup page selector
            const pageSelect = document.getElementById('page-select');
            if (pageSelect) {
                pageSelect.addEventListener('change', function() {
                    currentPage = parseInt(this.value);
                    updateURL(currentPage);
                    buildGrid();
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
                        buildGrid();
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
                        buildGrid();
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
                        buildGrid();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            }
            
            // Handle back/forward buttons
            window.addEventListener('popstate', function() {
                currentPage = getPageFromURL();
                buildGrid();
            });
            
        } catch (err) {
            console.error('Failed to load releases:', err);
            const grid = document.getElementById('grid');
            if (grid) {
                grid.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;">Failed to load releases. Please try again later.</p>';
            }
        }
    }

    function buildGrid() {
        // Filter based on search
        if (searchQuery) {
            filteredReleases = allReleases.filter(function(rel) {
                return rel.artist.toLowerCase().indexOf(searchQuery) !== -1 ||
                       rel.title.toLowerCase().indexOf(searchQuery) !== -1 ||
                       rel.cat.toLowerCase().indexOf(searchQuery) !== -1;
            });
        } else {
            filteredReleases = [...allReleases];
        }
        
        var totalItems = filteredReleases.length;
        totalPages = Math.ceil(totalItems / perPage);
        if (totalPages === 0) totalPages = 1;
        
        // Clamp current page
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        
        // Calculate start and end
        var start = (currentPage - 1) * perPage;
        var end = Math.min(start + perPage, totalItems);
        
        // Get the grid element
        var grid = document.getElementById('grid');
        if (!grid) return;
        
        // Clear grid
        grid.innerHTML = '';
        
        // Show "no results" message
        if (totalItems === 0) {
            grid.innerHTML = '<p style="color:#fff;text-align:center;padding:40px;font-family:Roboto,Arial,sans-serif;">No releases found</p>';
            updatePaginationControls();
            return;
        }
        
        // Build tiles for current page
        for (var i = start; i < end; i++) {
            var rel = filteredReleases[i];
            
            // Create link wrapper
            var link = document.createElement('a');
            link.href = '/releases/' + rel.cat + '.html';
            link.className = 'tile';
            link.style.display = 'flex';
            link.style.flexDirection = 'column';
            link.style.textDecoration = 'none';
            link.style.color = 'inherit';
            link.style.border = '2px solid #2a2a2a';
            link.style.padding = '10px';
            link.style.background = '#111';
            link.style.borderRadius = '8px';
            link.style.transition = 'border-color 0.3s, transform 0.3s';
            link.style.aspectRatio = '3/4';
            link.style.overflow = 'hidden';
            link.style.cursor = 'pointer';
            
            // Hover styles via CSS
            link.onmouseenter = function() {
                this.style.borderColor = '#e4de69';
                this.style.transform = 'translateY(-4px)';
            };
            link.onmouseleave = function() {
                this.style.borderColor = '#2a2a2a';
                this.style.transform = 'translateY(0)';
            };
            
            // Image
            var img = document.createElement('img');
            img.src = 'https://cdn.hyperproduction.co.za/artworks/' + rel.cat + '.png';
            img.onerror = function() { this.src = 'https://hyperproduction.co.za/placeholder.png'; };
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.borderRadius = '4px';
            img.style.flexShrink = '0';
            
            // Info
            var info = document.createElement('div');
            info.className = 'tile-info';
            info.style.marginTop = '8px';
            info.style.lineHeight = '1.3';
            info.style.flex = '1';
            info.style.display = 'flex';
            info.style.flexDirection = 'column';
            info.style.justifyContent = 'flex-start';
            info.style.overflow = 'hidden';
            info.style.minHeight = '0';
            info.innerHTML = '<p class="artist" style="font-weight:700;margin:0;font-size:14px;color:#e4de69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + rel.artist + '</p>' +
                             '<p class="title" style="margin:0;font-size:12px;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + rel.title + '</p>';
            
            link.appendChild(img);
            link.appendChild(info);
            
            // Animation
            link.style.opacity = '0';
            link.style.transform = 'translateY(15px)';
            link.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            
            grid.appendChild(link);
            
            // Staggered fade-in
            (function(el, idx) {
                setTimeout(function() {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }, 30 + ((idx - start) * 60));
            })(link, i);
        }
        
        updatePaginationControls();
    }

    function updatePaginationControls() {
        var totalItems = filteredReleases.length;
        totalPages = Math.ceil(totalItems / perPage);
        if (totalPages === 0) totalPages = 1;
        
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
