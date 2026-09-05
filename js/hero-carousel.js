// ============================================
// HERO CAROUSEL
// ============================================
(function($) {
    const jsonUrl = 'https://cdn.hyperproduction.co.za/artworks/images.json';
    const imageBaseUrl = 'https://cdn.hyperproduction.co.za/artworks/';

    const initHeroCarousel = () => {
        fetch(jsonUrl)
            .then(response => response.json())
            .then(data => {
                const container = $('#artwork-carousel');
                container.empty();

                data.forEach(imgName => {
                    const imgTag = `<div><img src="${imageBaseUrl}${imgName}" class="carousel-img" alt="Artwork" crossorigin="anonymous"></div>`;
                    container.append(imgTag);
                });

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