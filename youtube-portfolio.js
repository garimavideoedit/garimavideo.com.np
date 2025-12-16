// YouTube Portfolio Video Gallery

// Local videos from assets/video folder
const localVideos = [
    { src: 'assets/video/Tiktok.mp4', title: 'Tiktok Video', category: 'video' },
    { src: 'assets/video/Tiktok video.mp4', title: 'Tiktok Video 2', category: 'video' },
    { src: 'assets/video/tt.mp4', title: 'TikTok Short', category: 'video' },
    { src: 'assets/video/Colorgrad.mp4', title: 'Color Grading', category: 'video' },
    { src: 'assets/video/colorgrad1.mp4', title: 'Color Grading 2', category: 'video' },
    { src: 'assets/video/Vide Editing2.mp4', title: 'Video Editing', category: 'video' },
    { src: 'assets/video/wedding.mp4', title: 'Wedding Video', category: 'video' },
    { src: 'assets/video/AQMSeyyinm3q7h97y3ohqNuf_tOJVVJ-xR4lRpqghqWm_MCpGtGTkhmsd0W3gRRmuf5Klu0YV3DtczqPIw4aoE5uJjj1OTLKUUppQtdNu1mGUQ.mp4', title: 'Professional Edit 1', category: 'video' },
    { src: 'assets/video/AQMwfOT_jX6IEASNOBi4yIePbvTLlRmfoMYtw0Vll4nmPeUGl2bmctPtyp-zSd_H_NB8wZRHqp0D9lgQEe0ms3CrDsNPJ2O-CwoDj_J7YRXutQ.mp4', title: 'Professional Edit 2', category: 'video' },
    { src: 'assets/video/AQPLXXuhZYPIP9dh9Bsi_7HXCgTLSp0EufpYKUmgqgiSnswnN0bPwOCnsb1f0_Ne2-YKLBn5yn3gj43LCuxZPV5_AL7G5c4qkELPNG1AdCcNJg.mp4', title: 'Professional Edit 3', category: 'video' },
];

// Photos from assets folder
const localPhotos = [
    { src: 'assets/1.jpg', title: 'Photography Work 1', category: 'photo' },
    { src: 'assets/2.jpg', title: 'Photography Work 2', category: 'photo' },
    { src: 'assets/3.jpg', title: 'Photography Work 3', category: 'photo' },
    { src: 'assets/4.jpg', title: 'Photography Work 4', category: 'photo' },
    { src: 'assets/5.jpg', title: 'Photography Work 5', category: 'photo' },
    { src: 'assets/6.jpg', title: 'Photography Work 6', category: 'photo' },
];

// Web Design Projects
const webProjects = [
    { url: 'https://globalnepalihub.com/', title: 'Global Nepali Hub', thumbnail: 'assets/web1.jpg', category: 'web' },
    { url: 'https://jayaphotostudio.vercel.app/', title: 'Jaya Photo Studio', thumbnail: 'assets/web2.jpg', category: 'web' },
    { url: 'https://readdy.link/preview/74d4fbf2-8378-4adf-baee-b2a82cc8a177/2251046', title: 'Portfolio Website 1', thumbnail: 'assets/web3.jpg', category: 'web' },
    { url: 'https://readdy.link/preview/fab41200-e5dc-4c52-a2a4-f1c1cce262ef/3075061', title: 'Portfolio Website 2', thumbnail: 'assets/web4.jpg', category: 'web' },
];

function loadLocalVideos() {
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;
    
    localVideos.forEach((video) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('data-category', video.category);
        
        portfolioItem.innerHTML = `
            <div class="portfolio-video-wrapper">
                <video class="local-video" muted loop playsinline preload="metadata">
                    <source src="${video.src}#t=0.1" type="video/mp4">
                </video>
                <div class="play-overlay"><div class="play-button">▶</div></div>
            </div>
            <div class="portfolio-info"><h4>${video.title}</h4></div>
        `;
        
        const videoElement = portfolioItem.querySelector('.local-video');
        const playOverlay = portfolioItem.querySelector('.play-overlay');
        
        portfolioItem.addEventListener('mouseenter', () => {
            videoElement.play();
            playOverlay.style.opacity = '0';
        });
        
        portfolioItem.addEventListener('mouseleave', () => {
            videoElement.pause();
            videoElement.currentTime = 0;
            playOverlay.style.opacity = '1';
        });
        
        portfolioGrid.appendChild(portfolioItem);
    });
}

function loadPhotoPortfolio() {
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;
    
    localPhotos.forEach((photo) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('data-category', photo.category);
        
        portfolioItem.innerHTML = `
            <div class="portfolio-photo-wrapper">
                <img class="photo-image" src="${photo.src}" alt="${photo.title}">
                <div class="photo-overlay"><div class="zoom-icon">🔍</div></div>
            </div>
            <div class="portfolio-info"><h4>${photo.title}</h4></div>
        `;
        
        const photoImage = portfolioItem.querySelector('.photo-image');
        portfolioItem.addEventListener('mouseenter', () => { photoImage.style.transform = 'scale(1.2)'; });
        portfolioItem.addEventListener('mouseleave', () => { photoImage.style.transform = 'scale(1)'; });
        portfolioItem.addEventListener('click', () => { window.open(photo.src, '_blank'); });
        
        portfolioGrid.appendChild(portfolioItem);
    });
}

function loadWebProjects() {
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;
    
    webProjects.forEach((project) => {
        const portfolioItem = document.createElement('div');
        portfolioItem.className = 'portfolio-item';
        portfolioItem.setAttribute('data-category', project.category);
        
        portfolioItem.innerHTML = `
            <div class="portfolio-video-wrapper" onclick="window.open('${project.url}', '_blank')">
                <iframe class="website-preview" src="${project.url}" scrolling="no"></iframe>
                <div class="website-overlay">
                    <div class="visit-icon">🌐 Visit Website</div>
                </div>
            </div>
            <div class="portfolio-info"><h4>${project.title}</h4></div>
        `;
        
        portfolioGrid.appendChild(portfolioItem);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadLocalVideos();
    loadPhotoPortfolio();
    loadWebProjects();
});

setTimeout(() => {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            const portfolioItems = document.querySelectorAll('.portfolio-item');
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.getAttribute('data-category') === filter) {
                    item.style.display = 'block';
                    setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 100);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'scale(0.8)';
                    setTimeout(() => { item.style.display = 'none'; }, 300);
                }
            });
        });
    });
}, 500);