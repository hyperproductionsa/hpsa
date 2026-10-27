(function ($) {
    const releasesUrl = '/releases.json';
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const promoWindowDays = 14;
    const fallbackCount = 6;

    // Use the label's local calendar date, regardless of the visitor's timezone.
    const getSouthAfricanToday = () => {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Africa/Johannesburg',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());
        const part = type => parts.find(item => item.type === type).value;
        return new Date(Date.UTC(
            Number(part('year')),
            Number(part('month')) - 1,
            Number(part('day'))
        ));
    };

    const parseReleaseDate = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day ? date : null;
    };

    const getReleaseRibbon = (releaseDate, today) => {
        const date = parseReleaseDate(releaseDate);
        if (!date) return null;

        const daysUntilRelease = Math.round((date - today) / 86400000);
        if (daysUntilRelease >= 1 && daysUntilRelease <= 14) return 'pre-order';
        if (daysUntilRelease >= -13 && daysUntilRelease <= 0) return 'promo';
        return null;
    };

    const selectCarouselReleases = releases => {
        const today = getSouthAfricanToday();
        const windowEnd = new Date(today);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + promoWindowDays);

        const dated = releases
            .map(release => ({ ...release, _carouselDate: parseReleaseDate(release.release_date) }))
            .filter(release => release._carouselDate && release.artwork_url && release.release_url)
            .sort((a, b) => b._carouselDate - a._carouselDate);

        // Promote releases scheduled from today through the next 14 days.
        // release_status is intentionally ignored.
        const upcoming = dated.filter(release =>
            release._carouselDate >= today && release._carouselDate <= windowEnd
        );

        // Keep at most six slides, with the nearest upcoming release first.
        const selected = upcoming
            .slice()
            .sort((a, b) => a._carouselDate - b._carouselDate)
            .slice(0, fallbackCount);
        const selectedCats = new Set(selected.map(release => release.cat));

        // If fewer than six releases are in the promo window, fill remaining slots
        // with the latest already-released items.
        if (selected.length < fallbackCount) {
            const released = dated.filter(release =>
                release._carouselDate <= today && !selectedCats.has(release.cat)
            );
            selected.push(...released.slice(0, fallbackCount - selected.length));
        }

        // If there are still fewer than six, fill from any remaining dated releases.
        if (selected.length < fallbackCount) {
            const selectedKeys = new Set(selected.map(release => release.cat));
            selected.push(...dated
                .filter(release => !selectedKeys.has(release.cat))
                .slice(0, fallbackCount - selected.length));
        }

        // Newest date first in the rendered carousel.
        return selected.sort((a, b) => b._carouselDate - a._carouselDate);
    };

    const initHeroCarousel = () => {
        fetch(releasesUrl, { cache: 'no-cache' })
            .then(response => {
                if (!response.ok) throw new Error('Could not load releases.json');
                return response.json();
            })
            .then(releases => {
                const container = $('#artwork-carousel');
                if (container.hasClass('slick-initialized')) {
                    container.slick('unslick');
                }
                container.empty();

                selectCarouselReleases(releases).forEach(release => {
                    const slide = document.createElement('div');
                    const link = document.createElement('a');
                    const image = document.createElement('img');

                    link.href = release.release_url;
                    link.className = 'hero-link';
                    image.src = release.artwork_url;
                    image.className = 'carousel-img';
                    image.alt = [release.artist, release.title].filter(Boolean).join(' - ') || 'Release artwork';
                    image.loading = 'lazy';
                    image.crossOrigin = 'anonymous';

                    link.appendChild(image);
                    const ribbonType = getReleaseRibbon(release.release_date, getSouthAfricanToday());
                    if (ribbonType) {
                        const ribbon = document.createElement('span');
                        ribbon.className = 'release-ribbon release-ribbon--' + ribbonType;
                        ribbon.textContent = ribbonType === 'pre-order' ? 'PRE-ORDER' : 'PROMO';
                        ribbon.setAttribute('aria-label', ribbonType === 'pre-order' ? 'Pre-order period' : 'Promo period');
                        link.appendChild(ribbon);
                    }
                    slide.appendChild(link);
                    container.append(slide);
                });

                if (!isMobile && !document.getElementById('hero-carousel-hover-style')) {
                    const style = document.createElement('style');
                    style.id = 'hero-carousel-hover-style';
                    style.textContent = `
                        .hero-link {
                            display: block;
                            text-decoration: none;
                            outline: none;
                            cursor: pointer;
                        }
                        .hero-link .carousel-img {
                            transition: transform 0.3s ease;
                            transform: scale(1);
                        }
                        .hero-link:hover .carousel-img {
                            transform: scale(0.8);
                        }
                    `;
                    document.head.appendChild(style);
                }

                if (container.children().length) {
                    container.slick({
                        infinite: container.children().length > 1,
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        autoplay: container.children().length > 1,
                        autoplaySpeed: 1000,
                        speed: 800,
                        arrows: false,
                        dots: false,
                        responsive: [{ breakpoint: 768, settings: { slidesToShow: 1 } }]
                    });
                }
            })
            .catch(err => console.error('Hero Carousel Error:', err));
    };

    const waitForHero = setInterval(function () {
        if ($.fn.slick && $('#artwork-carousel').length) {
            clearInterval(waitForHero);
            initHeroCarousel();
        }
    }, 100);
})(jQuery);
