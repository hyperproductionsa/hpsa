// ============================================
// HERO CAROUSEL - With Shrink on Hover & Release Links
// ============================================
(function($) {
    const jsonUrl = 'https://cdn.hyperproduction.co.za/artworks/images.json';
    const imageBaseUrl = 'https://cdn.hyperproduction.co.za/artworks/';

    // Check if device is mobile (touch device)
    const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const initHeroCarousel = () => {
        fetch(jsonUrl)
            .then(response => response.json())
            .then(data => {
                const container = $('#artwork-carousel');
                container.empty();

                data.forEach(imgName => {
                    // Extract catalog number from filename (e.g., HYP130.png -> HYP130)
                    const catNo = imgName.replace('.png', '');
                    
                    // Create wrapper with link
                    const linkTag = `
                        <div>
                            <a href="/releases/${catNo}.html" class="hero-link">
                                <img src="${imageBaseUrl}${imgName}" class="carousel-img" alt="Artwork" crossorigin="anonymous">
                            </a>
                        </div>
                    `;
                    container.append(linkTag);
                });

                // Add shrink-on-hover CSS only for desktop
                if (!isMobile) {
                    const style = document.createElement('style');
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

                container.slick({
                    infinite: true,
                    slidesToShow: 3,
                    slidesToScroll: 1,
                    autoplay: true,
                    autoplaySpeed: 1000,
                    speed: 800,
                    arrows: false,
                    dots: false,
                    responsive: [
                        {
                            breakpoint: 768,
                            settings: {
                                slidesToShow: 1
                            }
                        }
                    ]
                });
            })
            .catch(err => console.error('Hero Carousel Error:', err));
    };

    // Wait for DOM and Slick to be ready
    const waitForHero = setInterval(function() {
        if ($.fn.slick && $('#artwork-carousel').length) {
            clearInterval(waitForHero);
            initHeroCarousel();
        }
    }, 100);
})(jQuery);
