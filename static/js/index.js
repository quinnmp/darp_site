window.HELP_IMPROVE_VIDEOJS = false;

$(document).ready(function() {
    
    // 1. Navbar Logic
    $(".navbar-burger").click(function() {
        $(".navbar-burger").toggleClass("is-active");
        $(".navbar-menu").toggleClass("is-active");
    });

    // 2. Setup Carousel Options - Try WITHOUT infinite scroll
    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,           // Use loop instead of infinite
        infinite: false,      // Disable infinite
        autoplay: false,
        autoplaySpeed: 3000,
    }

    // 3. Remove conflicting data attributes
    $('.carousel').each(function() {
        this.removeAttribute('data-infinite');
        this.removeAttribute('data-slides-to-show');
        this.removeAttribute('data-slides-to-scroll');
    });

    // 4. Pre-Process Tabs
    $('.domain-content').each(function() {
        if ($(this).attr('id') !== 'mujoco-content') {
            $(this).addClass('is-hidden-content');
        }
        $(this).css('display', ''); 
    });

    // 5. Carousel Management
    var carousels = {};
    
    function initCarousel(tabId) {
        var selector = '#' + tabId + '-content .carousel';
        
        if (carousels[tabId]) {
            try {
                carousels[tabId].forEach(function(c) { 
                    if (c && c.destroy) c.destroy(); 
                });
            } catch(e) {}
            carousels[tabId] = null;
        }
        
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                carousels[tabId] = bulmaCarousel.attach(selector, options);
            });
        });
    }
    
    setTimeout(function() {
        initCarousel('mujoco');
    }, 100);

    // 6. Tab Switching Logic
    $('.tabs ul li').on('click', function() {
        var tab = $(this);
        var targetId = tab.data('tab');

        tab.addClass('is-active').siblings().removeClass('is-active');
        $('.domain-content').addClass('is-hidden-content');
        $('#' + targetId + '-content').removeClass('is-hidden-content');
        
        setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
            initCarousel(targetId);
        }, 150);
    });

    // 7. Initialize Slider
    bulmaSlider.attach();
});
