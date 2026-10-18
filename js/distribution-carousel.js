(function($){
  const stores = [
    {name:'Spotify',icon:'spotify'},
    {name:'Apple Music',icon:'apple'},
    {name:'Amazon Music',icon:'amazon-music'},
    {name:'Beatport',icon:'beatport'},
    {name:'Traxsource',icon:'traxsource'},
    {name:'Deezer',icon:'deezer'},
    {name:'TIDAL',icon:'tidal'},
    {name:'SoundCloud',icon:'soundcloud'},
    {name:'YouTube Music',icon:'youtube-music'},
    {name:'Audiomack',icon:'audiomack'},
    {name:'Pandora',icon:'pandora'},
    {name:'Boomplay',icon:'boomplay'},
    {name:'Anghami',icon:'anghami'},
    {name:'Qobuz',icon:'qobuz'}
  ];

  const initDistributionCarousel = () => {
    const $carousel = $('#distribution-carousel');
    if (!$carousel.length || $carousel.hasClass('slick-initialized')) return;

    const html = stores.map(store =>
      '<div class="distro-img-wrapper">' +
        '<div class="distro-tile" role="img" aria-label="' + store.name + '">' +
          '<span class="distro-icon" aria-hidden="true" style="--distro-icon:url(\'/logo/dsp-icons/' + store.icon + '.svg\')"></span>' +
        '</div>' +
      '</div>'
    ).join('');

    $carousel.html(html).slick({
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
        {breakpoint:1024,settings:{slidesToShow:6}},
        {breakpoint:768,settings:{slidesToShow:4}},
        {breakpoint:480,settings:{slidesToShow:3}}
      ]
    });
  };

  const waitForDistro = setInterval(function(){
    if ($.fn.slick && $('#distribution-carousel').length) {
      clearInterval(waitForDistro);
      initDistributionCarousel();
    }
  }, 100);
})(jQuery);
