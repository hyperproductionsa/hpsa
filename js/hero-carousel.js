// ============================================
// HERO CAROUSEL - With Heartbeat & Release Links
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

                // Add heartbeat CSS only for desktop
                if (!isMobile) {
                    const style = document.createElement('style');
                    style.textContent = `
                        .hero-link {
                            display: block;
                            text-decoration: none;
                            outline: none;
                        }
                        .hero-link .carousel-img {
                            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                            transform-origin: center center;
                        }
                        .hero-link:hover .carousel-img {
                            animation: heartbeat 0.8s ease 3;
                        }
                        @keyframes heartbeat {
                            0% { transform: scale(1); }
                            14% { transform: scale(1.05); }
                            28% { transform: scale(1); }
                            42% { transform: scale(1.04); }
                            70% { transform: scale(1); }
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
