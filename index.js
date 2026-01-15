// Progress Sidebar
document.addEventListener('DOMContentLoaded', () => {
  const progressItems = document.querySelectorAll('.progress-item');
  const progressLineFill = document.querySelector('.progress-line-fill');
  const progressTrack = document.querySelector('.progress-track');

  // Build sections array from progress items to ensure they match
  const sections = [];
  progressItems.forEach(item => {
    const id = item.dataset.section;
    let el;
    if (id === 'hero') {
      el = document.querySelector('.hero-flow');
    } else {
      el = document.getElementById(id);
    }
    if (el) {
      sections.push({ id, el });
    }
  });

  const updateProgress = () => {
    if (sections.length === 0) return;

    const viewportHeight = window.innerHeight;
    const activationThreshold = viewportHeight * 0.35;

    // Find active section index
    let activeIdx = 0;
    for (let idx = 0; idx < sections.length; idx++) {
      const rect = sections[idx].el.getBoundingClientRect();
      if (rect.top <= activationThreshold) {
        activeIdx = idx;
      } else {
        break;
      }
    }

    // Update progress line fill based on active section
    if (progressLineFill && progressTrack) {
      const trackHeight = progressTrack.offsetHeight;
      const maxFillHeight = trackHeight - 44; // Account for top/bottom padding
      const fillHeight = (activeIdx / Math.max(sections.length - 1, 1)) * maxFillHeight;
      progressLineFill.style.height = `${Math.min(Math.max(fillHeight, 0), maxFillHeight)}px`;
    }

    // Update dot states
    progressItems.forEach(item => {
      const sectionId = item.dataset.section;
      const sectionIdx = sections.findIndex(s => s.id === sectionId);

      item.classList.remove('active', 'passed');
      if (sectionIdx === activeIdx) {
        item.classList.add('active');
      } else if (sectionIdx >= 0 && sectionIdx < activeIdx) {
        item.classList.add('passed');
      }
    });
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
});

// Results Carousel
document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  const domainBtns = document.querySelectorAll('.domain-btn');
  const domainContents = document.querySelectorAll('.domain-content');

  domainBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      
      // Update buttons
      domainBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      domainContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${tab}-content`).classList.add('active');
    });
  });

  // Carousel navigation
  const carouselNavs = document.querySelectorAll('.carousel-nav');

  carouselNavs.forEach(nav => {
    nav.addEventListener('click', () => {
      const carouselId = nav.dataset.carousel;
      const carousel = document.getElementById(`carousel-${carouselId}`);
      const items = carousel.querySelectorAll('.carousel-item');
      let currentIndex = Array.from(items).findIndex(item => item.classList.contains('active'));

      // Remove active from current
      items[currentIndex].classList.remove('active');

      // Calculate new index
      if (nav.classList.contains('prev')) {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
      } else {
        currentIndex = (currentIndex + 1) % items.length;
      }

      // Add active to new (will trigger fadeIn animation)
      items[currentIndex].classList.add('active');

      // Handle video playback
      items.forEach((item, idx) => {
        const videos = item.querySelectorAll('video');
        videos.forEach(video => {
          if (idx === currentIndex) {
            video.play();
          } else {
            video.pause();
          }
        });
      });
    });
  });
});
