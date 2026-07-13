let projects = [];

// Загружаем проекты через публичное API
fetch('/api/projects.php')
    .then(response => response.json())
    .then(data => {
        projects = data;
        renderPortfolio();
        document.dispatchEvent(new CustomEvent('projectsLoaded', { detail: projects }));
    })
    .catch(error => {
        console.error('Ошибка загрузки проектов:', error);
        renderPortfolio();
    });

function renderPortfolio() {
    const grid = document.getElementById('portfolioGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!projects.length) {
        grid.innerHTML = '<p style="text-align:center; color:var(--text-light);">Проекты временно недоступны</p>';
        return;
    }

    projects.forEach(project => {
        const card = document.createElement('a');
        card.className = 'portfolio-card';
        card.href = project.link;
        card.target = '_self';

        const imgDiv = document.createElement('div');
        imgDiv.className = 'card-img';
        if (project.image && (project.image.startsWith('http') || project.image.startsWith('/'))) {
            const img = document.createElement('img');
            img.src = project.image;
            img.alt = project.title;
            imgDiv.appendChild(img);
            // Определяем ориентацию после загрузки
            img.onload = function() {
                if (img.naturalHeight > img.naturalWidth) {
                    card.classList.add('portrait');
                } else {
                    card.classList.add('landscape');
                }
            };
            // Если изображение уже в кеше и onload не сработает
            if (img.complete) {
                if (img.naturalHeight > img.naturalWidth) {
                    card.classList.add('portrait');
                } else {
                    card.classList.add('landscape');
                }
            }
        } else {
            imgDiv.textContent = project.image || 'Изображение проекта';
        }

        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'card-body';

        const title = document.createElement('h3');
        title.textContent = project.title;

        const desc = document.createElement('p');
        desc.textContent = project.shortDescription;

        const linkText = document.createElement('span');
        linkText.className = 'card-link-text';
        linkText.textContent = 'Подробнее →';

        bodyDiv.appendChild(title);
        bodyDiv.appendChild(desc);
        bodyDiv.appendChild(linkText);

        card.appendChild(imgDiv);
        card.appendChild(bodyDiv);

        grid.appendChild(card);
    });
}

// Мобильное меню
const burger = document.getElementById('burger');
const navList = document.getElementById('navList');
if (burger && navList) {
    burger.addEventListener('click', () => {
        navList.classList.toggle('active');
    });
    navList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('active');
        });
    });
}
// Загружаем контент страницы (тексты, контакты)
fetch('/api/site_content.php')
    .then(response => response.json())
    .then(data => {
        if (data) {
            // Hero
            document.getElementById('hero-title').innerHTML = data.hero_title || '';
            document.getElementById('hero-subtitle').textContent = data.hero_subtitle || '';
            const heroBtn = document.getElementById('hero-button');
            if (heroBtn) {
                heroBtn.textContent = data.hero_button_text || 'Обсудить проект';
                heroBtn.href = '#contact';
            }

            // О нас
            document.getElementById('about-title').textContent = data.about_title || '';
            const aboutTextDiv = document.getElementById('about-text');
            if (aboutTextDiv && data.about_paragraphs) {
                aboutTextDiv.innerHTML = data.about_paragraphs.map(p => `<p>${p}</p>`).join('');
                if (data.about_tech) {
                    aboutTextDiv.innerHTML += `<p><strong>Технологии:</strong> ${data.about_tech}</p>`;
                }
            }

            // Контакты
            document.getElementById('contact-title').textContent = data.contact_title || '';
            document.getElementById('contact-subtitle').textContent = data.contact_subtitle || '';
            document.getElementById('contact-text').textContent = data.contact_text || '';

            const linksDiv = document.getElementById('contact-links');
            if (linksDiv) {
                let linksHTML = '';
                if (data.contact_telegram) {
                    linksHTML += `<a href="${data.contact_telegram}" target="_blank" class="btn" style="background: #2AABEE;">${data.contact_telegram_label || 'Telegram'}</a>`;
                }
                if (data.contact_vk) {
                    linksHTML += `<a href="${data.contact_vk}" target="_blank" class="btn" style="background: #0077FF;">${data.contact_vk_label || 'ВКонтакте'}</a>`;
                }
                if (data.contact_email) {
                    linksHTML += `<a href="mailto:${data.contact_email}" class="btn" style="background: #555;">${data.contact_email_label || 'Email'}</a>`;
                }
                linksDiv.innerHTML = linksHTML;
            }
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки контента сайта:', error);
    });