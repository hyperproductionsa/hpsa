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

    const selectCarouselReleases = releases => {
        const today = getSouthAfricanToday();
        const windowEnd = new Date(today);
        windowEnd.setUTCDate(windowEnd.getUTCDate() + promoWindowDays);

        const dated = releases
            .map(release => ({ ...release, _carouselDate: parseReleaseDate(release.release_date) }))
            .filter(release => release._carouselDate && release.artwork_url && release.release_url)
            .sort((a, b) => b._carouselDate - a._carouselDate);

        // Promote releases scheduled from today through the next 14 days.
        // release_status is intentionally ignored. Keep at most six, prioritising
        // the releases with the nearest dates.
        const upcoming = dated.filter(release =>
            release._carouselDate >= today && release._carouselDate <= windowEnd
        );

        if (upcoming.length) return upcoming.slice(-fallbackCount).reverse();

        // If no release is in its promo window, keep the latest six already released.
        const released = dated.filter(release => release._carouselDate <= today);
        const fallback = released.length ? released : dated;
        return fallback.slice(0, fallbackCount).reverse();
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
