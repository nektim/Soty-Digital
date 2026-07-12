// project/project.js

function getProjectIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    return id ? parseInt(id) : null;
}

function findProjectById(id) {
    return typeof projects !== 'undefined' ? projects.find(p => p.id === id) : null;
}

// ---- Лайтбокс ----
let currentImages = [];
let currentIndex = 0;

function openLightbox(images, index) {
    currentImages = images;
    currentIndex = index;
    renderLightbox();
    document.getElementById('lightbox-overlay').style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox-overlay').style.display = 'none';
}

function renderLightbox() {
    const overlay = document.getElementById('lightbox-overlay');
    const img = overlay.querySelector('.lightbox-img');
    const counter = overlay.querySelector('.lightbox-counter');
    img.src = currentImages[currentIndex];
    counter.textContent = `${currentIndex + 1} из ${currentImages.length}`;

    // Стрелки
    const prevBtn = overlay.querySelector('.lightbox-prev');
    const nextBtn = overlay.querySelector('.lightbox-next');
    prevBtn.style.display = currentIndex > 0 ? 'block' : 'none';
    nextBtn.style.display = currentIndex < currentImages.length - 1 ? 'block' : 'none';
}

function showPrev() {
    if (currentIndex > 0) {
        currentIndex--;
        renderLightbox();
    }
}

function showNext() {
    if (currentIndex < currentImages.length - 1) {
        currentIndex++;
        renderLightbox();
    }
}

// ---- Создание HTML лайтбокса (вставляется один раз при загрузке страницы) ----
function createLightboxOverlay() {
    if (document.getElementById('lightbox-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
        <span class="lightbox-close">&times;</span>
        <button class="lightbox-prev">&lsaquo;</button>
        <img class="lightbox-img" src="" alt="Просмотр скриншота">
        <button class="lightbox-next">&rsaquo;</button>
        <div class="lightbox-counter"></div>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('lightbox-close')) {
            closeLightbox();
        }
    });
    overlay.querySelector('.lightbox-prev').addEventListener('click', (e) => {
        e.stopPropagation();
        showPrev();
    });
    overlay.querySelector('.lightbox-next').addEventListener('click', (e) => {
        e.stopPropagation();
        showNext();
    });
    document.body.appendChild(overlay);

    // Закрытие по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
    });
}

// ---- Рендеринг страницы проекта ----
function renderProjectPage() {
    const main = document.getElementById('projectMain');
    const id = getProjectIdFromUrl();
    const project = findProjectById(id);

    if (!project) {
        main.innerHTML = `
            <div class="not-found container">
                <h2>Проект не найден</h2>
                <p>Возможно, он был удалён или ссылка устарела.</p>
                <a href="../sotydigital.html" class="btn">Вернуться на главную</a>
            </div>
        `;
        document.title = 'Проект не найден — SotyDigital';
        return;
    }

    document.title = `${project.title} — SotyDigital`;

    // Галерея с кликабельными изображениями
    let galleryHTML = '';
    if (project.screenshots && project.screenshots.length > 0) {
        const imagesArray = project.screenshots;
        galleryHTML = `
            <h2 class="section-title" style="margin-top: 2rem;">Скриншоты работы бота</h2>
            <div class="gallery">
                ${imagesArray.map((src, index) => `
                    <img src="${src}" alt="Скриншот проекта" class="gallery-thumb" data-index="${index}" loading="lazy">
                `).join('')}
            </div>
        `;
    }

    main.innerHTML = `
        <section class="project-hero">
            <div class="container">
                <h1>${project.title}</h1>
                <p class="subtitle">${project.shortDescription}</p>
            </div>
        </section>
        <section class="project-content">
            <div class="container">
                <div class="project-description">
                    ${project.fullDescription.replace(/\n/g, '<br>')}
                </div>
                ${galleryHTML}
                <div style="text-align: center;">
                    <a href="../sotydigital.html#portfolio" class="back-link">← Назад к портфолио</a>
                </div>
            </div>
        </section>
    `;

    // Навешиваем обработчики на миниатюры
    const thumbs = document.querySelectorAll('.gallery-thumb');
    if (thumbs.length > 0) {
        const images = project.screenshots;
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.getAttribute('data-index'));
                openLightbox(images, index);
            });
        });
    }
}

// Ожидание данных проектов
if (typeof projects !== 'undefined' && projects.length > 0) {
    createLightboxOverlay();
    renderProjectPage();
} else {
    document.addEventListener('projectsLoaded', (e) => {
        projects = e.detail;
        createLightboxOverlay();
        renderProjectPage();
    });
}