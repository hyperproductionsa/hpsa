// ============================================
// DISTRIBUTION CAROUSEL
// ============================================
(function($) {
    const jsonUrl = 'https://hyperproduction.co.za/logo/stores/images.json';
    const imageBaseUrl = 'https://hyperproduction.co.za/logo/stores/';

    const initDistributionCarousel = () => {
        $.getJSON(jsonUrl, function(data) {
            const $carousel = $('#distribution-carousel');
            $carousel.empty();

            let html = '';
            $.each(data, function(i, name) {
                html += '<div class="distro-img-wrapper"><img src="' + imageBaseUrl + name + '" class="distro-img" alt="Distribution Partner"></div>';
            });
            $carousel.html(html);

            $carousel.slick({
                slidesToShow: 8,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 0,
                speed: 3000,
                cssEase: 'linear',
                pauseOnHover: false,
                pauseOnFocus: false,
                arrows: false,
                dots: false,
                infinite: true,
                responsive: [
                    { breakpoint: 1024, settings: { slidesToShow: 6 } },
                    { breakpoint: 768, settings: { slidesToShow: 4 } },
                    { breakpoint: 480, settings: { slidesToShow: 3 } }
                ]
            });
        }).fail(function() {
            console.error('Failed to load distribution logos JSON');
        });
    };

    // Wait for DOM and Slick to be ready
    const waitForDistro = setInterval(function() {
        if ($.fn.slick && $('#distribution-carousel').length) {
            clearInterval(waitForDistro);
            initDistributionCarousel();
        }
    }, 100);
})(jQuery);