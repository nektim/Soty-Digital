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