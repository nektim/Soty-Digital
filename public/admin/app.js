// Загрузка файла на сервер и возврат URL
async function uploadFile(file, folder = 'image') {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`/api/upload.php?folder=${folder}`, {
        method: 'POST',
        body: formData,
        // Не устанавливаем Content-Type, браузер сам добавит с boundary
    });
    return res.json();
}
const API = '/api';

async function api(url, options = {}) {
    const res = await fetch(API + url, {
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    if (res.status === 401) {
        // Сессия истекла или не авторизован – показываем логин
        showLogin();
        throw new Error('Unauthorized');
    }
    return res.json();
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m]);
}

// --- Авторизация ---
async function checkAuth() {
    const data = await api('/auth_check.php');
    return data.authenticated;
}

function showLogin() {
    document.getElementById('app').innerHTML = `
        <div class="login-box">
            <h1>Вход</h1>
            <div id="login-error" class="error" style="display:none"></div>
            <form id="login-form">
                <div class="form-group"><label>Логин</label><input type="text" name="login" required></div>
                <div class="form-group"><label>Пароль</label><input type="password" name="password" required></div>
                <button type="submit" class="btn">Войти</button>
            </form>
        </div>`;
    document.getElementById('login-form').onsubmit = async e => {
        e.preventDefault();
        const { login, password } = e.target;
        const res = await api('/login.php', {
            method: 'POST',
            body: JSON.stringify({ login: login.value, password: password.value })
        });
        if (res.success) showPanel();
        else {
            document.getElementById('login-error').textContent = res.message || 'Ошибка';
            document.getElementById('login-error').style.display = 'block';
        }
    };
}

// --- Панель управления ---
async function showPanel() {
    const projects = await api('/projects.php');
    renderProjects(projects);
}

// --- Настройки сайта (новая версия с превью) ---
let siteContentCache = {}; // кеш текущих данных с сервера

async function showSiteSettings() {
    // 1. Загружаем актуальные данные с сервера (или берём из кеша)
    const content = await api('/site_content.php');
    siteContentCache = content;

    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="admin-header">
            <h1>Настройки сайта</h1>
            <button class="btn logout-btn" onclick="showPanel()">← Назад</button>
        </div>
        <div class="settings-layout">
            <!-- Левая колонка: форма -->
            <div class="settings-form-col">
                <!-- Табы -->
                <div class="settings-tabs" id="settings-tabs">
                    <button class="settings-tab active" data-tab="hero">Hero</button>
                    <button class="settings-tab" data-tab="about">О нас</button>
                    <button class="settings-tab" data-tab="contact">Контакты</button>
                </div>

                <!-- Контейнер для форм разделов -->
                <div id="settings-forms">
                    ${renderHeroForm(content)}
                    ${renderAboutForm(content)}
                    ${renderContactForm(content)}
                </div>
            </div>

            <!-- Правая колонка: превью -->
            <div class="settings-preview-col">
                <div class="preview-phone">
                    <div class="preview-screen" id="preview-screen">
                        <!-- Превью будет заполняться динамически -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Инициализируем табы
    initSettingsTabs();

    // 3. Загружаем превью и вешаем слушатели на поля
    updatePreview(content);
    attachLivePreviewListeners();

    // 4. Восстанавливаем черновики из localStorage
    restoreDrafts();
}

// --- Рендер форм по разделам ---
function renderHeroForm(data) {
    return `
        <div class="settings-panel active" data-panel="hero">
            <form id="hero-form" class="settings-section-form">
                <h2>Главный экран (Hero)</h2>
                <div class="form-group">
                    <label>Заголовок</label>
                    <input type="text" name="hero_title" value="${escapeHtml(data.hero_title || '')}" data-preview="hero-title" data-type="html">
                </div>
                <div class="form-group">
                    <label>Подзаголовок</label>
                    <input type="text" name="hero_subtitle" value="${escapeHtml(data.hero_subtitle || '')}" data-preview="hero-subtitle" data-type="text">
                </div>
                <div class="form-group">
                    <label>Текст кнопки</label>
                    <input type="text" name="hero_button_text" value="${escapeHtml(data.hero_button_text || '')}" data-preview="hero-button" data-type="text">
                </div>
                <button type="submit" class="btn">Сохранить раздел</button>
                <span class="form-status" data-status="hero"></span>
            </form>
        </div>`;
}

function renderAboutForm(data) {
    const paragraphs = (data.about_paragraphs || []).join('\n');
    return `
        <div class="settings-panel" data-panel="about">
            <form id="about-form" class="settings-section-form">
                <h2>О нас</h2>
                <div class="form-group">
                    <label>Заголовок секции</label>
                    <input type="text" name="about_title" value="${escapeHtml(data.about_title || '')}" data-preview="about-title" data-type="text">
                </div>
                <div class="form-group">
                    <label>Абзацы (по одному на строку)</label>
                    <textarea name="about_paragraphs" rows="6" data-preview="about-text" data-type="paragraphs">${escapeHtml(paragraphs)}</textarea>
                </div>
                <div class="form-group">
                    <label>Технологии (строка в конце)</label>
                    <input type="text" name="about_tech" value="${escapeHtml(data.about_tech || '')}" data-preview="about-tech" data-type="text">
                </div>
                <button type="submit" class="btn">Сохранить раздел</button>
                <span class="form-status" data-status="about"></span>
            </form>
        </div>`;
}

function renderContactForm(data) {
    return `
        <div class="settings-panel" data-panel="contact">
            <form id="contact-form" class="settings-section-form">
                <h2>Контакты</h2>
                <div class="form-group">
                    <label>Заголовок секции</label>
                    <input type="text" name="contact_title" value="${escapeHtml(data.contact_title || '')}" data-preview="contact-title" data-type="text">
                </div>
                <div class="form-group">
                    <label>Подзаголовок</label>
                    <input type="text" name="contact_subtitle" value="${escapeHtml(data.contact_subtitle || '')}" data-preview="contact-subtitle" data-type="text">
                </div>
                <div class="form-group">
                    <label>Текст приглашения</label>
                    <textarea name="contact_text" rows="3" data-preview="contact-text" data-type="text">${escapeHtml(data.contact_text || '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Telegram (ссылка)</label>
                    <input type="text" name="contact_telegram" value="${escapeHtml(data.contact_telegram || '')}" data-preview="contact-links" data-type="links">
                </div>
                <div class="form-group">
                    <label>VK (ссылка)</label>
                    <input type="text" name="contact_vk" value="${escapeHtml(data.contact_vk || '')}" data-preview="contact-links" data-type="links">
                </div>
                <div class="form-group">
                    <label>Email (адрес)</label>
                    <input type="text" name="contact_email" value="${escapeHtml(data.contact_email || '')}" data-preview="contact-links" data-type="links">
                </div>
                <button type="submit" class="btn">Сохранить раздел</button>
                <span class="form-status" data-status="contact"></span>
            </form>
        </div>`;
}

// --- Логика табов ---
function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const panels = document.querySelectorAll('.settings-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            panels.forEach(p => {
                p.classList.toggle('active', p.dataset.panel === target);
            });
        });
    });
    // Показываем первый таб
    tabs[0]?.click();
}

// --- Живое превью ---
function updatePreview(data) {
    const preview = document.getElementById('preview-screen');
    if (!preview) return;

    const heroTitle = data.hero_title || 'Создаём Telegram-ботов<br>для вашего бизнеса';
    const heroSub = data.hero_subtitle || 'Автоматизируем общение с клиентами, приём заказов и поддержку.';
    const heroBtn = data.hero_button_text || 'Обсудить проект';
    const aboutTitle = data.about_title || 'О компании SotyDigital';
    const aboutParagraphs = data.about_paragraphs || [];
    const aboutTech = data.about_tech || '';
    const contactTitle = data.contact_title || 'Свяжитесь с нами';
    const contactSub = data.contact_subtitle || 'Мы всегда открыты для новых проектов и готовы ответить на ваши вопросы.';
    const contactText = data.contact_text || 'Чтобы заказать разработку Telegram-бота или получить бесплатную консультацию, просто напишите нам.';
    const tg = data.contact_telegram || '#';
    const vk = data.contact_vk || '#';
    const email = data.contact_email || '';

    let aboutHTML = aboutParagraphs.map(p => `<p style="font-size:0.8rem;color:#4a4a6a">${p}</p>`).join('');
    if (aboutTech) aboutHTML += `<p style="font-size:0.8rem;color:#4a4a6a"><strong>Технологии:</strong> ${aboutTech}</p>`;

    let linksHTML = '';
    if (tg) linksHTML += `<a href="${tg}" target="_blank" style="display:inline-block;padding:8px 16px;background:#2AABEE;color:#fff;border-radius:20px;text-decoration:none;font-size:0.7rem;">Telegram</a>`;
    if (vk) linksHTML += `<a href="${vk}" target="_blank" style="display:inline-block;padding:8px 16px;background:#0077FF;color:#fff;border-radius:20px;text-decoration:none;font-size:0.7rem;">ВКонтакте</a>`;
    if (email) linksHTML += `<a href="mailto:${email}" style="display:inline-block;padding:8px 16px;background:#555;color:#fff;border-radius:20px;text-decoration:none;font-size:0.7rem;">Email</a>`;

    preview.innerHTML = `
        <div style="background:#f0f5ff;padding:20px 10px;text-align:center;">
            <h2 style="font-size:1.4rem;color:#071c4b;">${heroTitle}</h2>
            <p style="font-size:0.9rem;color:#4a4a6a;">${heroSub}</p>
            <a href="#" style="display:inline-block;margin-top:10px;padding:10px 20px;background:#0556db;color:#fff;border-radius:20px;text-decoration:none;font-size:0.8rem;">${heroBtn}</a>
        </div>
        <div style="padding:20px 10px;">
            <h3 style="font-size:1.2rem;color:#071c4b;">${aboutTitle}</h3>
            ${aboutHTML}
        </div>
        <div style="padding:20px 10px;">
            <h3 style="font-size:1.2rem;color:#071c4b;">${contactTitle}</h3>
            <p style="font-size:0.8rem;color:#4a4a6a;">${contactSub}</p>
            <p style="font-size:0.8rem;color:#4a4a6a;">${contactText}</p>
            <div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-top:10px;">${linksHTML}</div>
        </div>
    `;
}

// Обновление превью при вводе
function attachLivePreviewListeners() {
    document.querySelectorAll('[data-preview]').forEach(el => {
        el.addEventListener('input', () => {
            const form = el.closest('form');
            if (!form) return;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            // Объединяем с текущим кешем, чтобы сохранить остальные разделы
            const merged = { ...siteContentCache, ...data };
            // Обрабатываем about_paragraphs как массив
            if (merged.about_paragraphs && typeof merged.about_paragraphs === 'string') {
                merged.about_paragraphs = merged.about_paragraphs.split('\n').map(s => s.trim()).filter(s => s);
            }
            updatePreview(merged);
            // Сохраняем черновик
            saveDraft(form.id, data);
        });
    });
}

// --- Сохранение раздела ---
document.addEventListener('submit', async (e) => {
    if (!e.target.classList.contains('settings-section-form')) return;
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    // Преобразуем about_paragraphs
    if (data.about_paragraphs && typeof data.about_paragraphs === 'string') {
        data.about_paragraphs = data.about_paragraphs.split('\n').map(s => s.trim()).filter(s => s);
    } else if (!data.about_paragraphs) {
        data.about_paragraphs = [];
    }

    // Обновляем кеш и отправляем на сервер
    Object.assign(siteContentCache, data);
    const res = await api('/site_content.php', { method: 'PUT', body: JSON.stringify(siteContentCache) });
    const statusEl = form.querySelector('.form-status');
    if (res.success) {
        statusEl.textContent = '✓ Сохранено';
        statusEl.className = 'form-status success';
        // Очищаем черновик для этого раздела
        clearDraft(form.id);
    } else {
        statusEl.textContent = '✗ Ошибка: ' + (res.error || '');
        statusEl.className = 'form-status error';
    }
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = 'form-status'; }, 3000);
});

// --- Черновики ---
function saveDraft(formId, data) {
    try {
        localStorage.setItem('soty_draft_' + formId, JSON.stringify(data));
    } catch (e) {}
}
function clearDraft(formId) {
    localStorage.removeItem('soty_draft_' + formId);
}
function restoreDrafts() {
    ['hero-form','about-form','contact-form'].forEach(id => {
        const saved = localStorage.getItem('soty_draft_' + id);
        if (!saved) return;
        try {
            const data = JSON.parse(saved);
            const form = document.getElementById(id);
            if (!form) return;
            Object.entries(data).forEach(([key, val]) => {
                const field = form.elements[key];
                if (field) field.value = val;
            });
            // Обновляем кеш и превью
            Object.assign(siteContentCache, data);
            updatePreview(siteContentCache);
        } catch (e) {}
    });
}

function renderProjects(projects) {
    let rows = '';
    if (!projects.length) rows = '<tr><td colspan="4">Нет проектов</td></tr>';
    else {
        rows = projects.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.title)}</td>
                <td>${escapeHtml(p.shortDescription)}</td>
                <td>
                    <button class="btn-sm btn-edit" onclick="editProject(${p.id})">Редактировать</button>
                    <button class="btn-sm btn-delete" onclick="deleteProject(${p.id})">Удалить</button>
                </td>
            </tr>`).join('');
    }

    document.getElementById('app').innerHTML = `
        <div class="admin-header">
            <h1>Управление проектами</h1>
            <button class="btn logout-btn" onclick="logout()">Выйти</button>
        </div>
        <div class="container">
            <button class="btn add-btn" onclick="showSiteSettings()">⚙️ Настройки сайта</button>
            <button class="btn add-btn" onclick="editProject()">+ Добавить</button>
            <table class="projects-table">
                <thead><tr><th>ID</th><th>Заголовок</th><th>Краткое описание</th><th>Действия</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div id="edit-form-container"></div>
        </div>`;
}

// --- Редактирование ---
async function editProject(id = null) {
    let project = { id: '', title: '', shortDescription: '', image: '', fullDescription: '', screenshots: '' };
    if (id) {
        const all = await api('/projects.php');
        project = all.find(p => p.id == id);
        project.screenshots = (project.screenshots || []).join('\n');
    }

    const container = document.getElementById('edit-form-container');
    container.innerHTML =`
        <h2>${id ? 'Редактировать' : 'Новый проект'}</h2>
        <form id="proj-form">
            <div class="form-group">
                <label>ID</label>
                <input type="number" name="id" value="${project.id}" ${id ? 'readonly' : ''} required>
            </div>
            <div class="form-group">
                <label>Заголовок</label>
                <input type="text" name="title" value="${escapeHtml(project.title)}" required>
            </div>
            <div class="form-group">
                <label>Краткое описание</label>
                <input type="text" name="shortDescription" value="${escapeHtml(project.shortDescription)}" required>
            </div>
            <div class="form-group">
                <label>Изображение (URL или текст)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" name="image" value="${escapeHtml(project.image)}" style="flex: 1;">
                    <button type="button" class="btn-upload" data-target="image" title="Загрузить изображение">+</button>
                </div>
            </div>
            <div class="form-group">
                <label>Полное описание</label>
                <textarea name="fullDescription" rows="6">${escapeHtml(project.fullDescription)}</textarea>
            </div>
            <div class="form-group">
                <label>Скриншоты (по URL на строку)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <textarea name="screenshots" rows="4" style="flex: 1;">${escapeHtml(project.screenshots)}</textarea>
                    <button type="button" class="btn-upload" data-target="screenshots" title="Загрузить скриншот">+</button>
                </div>
            </div>
            <button type="submit" class="btn">Сохранить</button>
            <button type="button" class="btn" onclick="document.getElementById('edit-form-container').innerHTML=''">Отмена</button>
        </form>`;
        // Обработчики кнопок загрузки
    container.querySelectorAll('.btn-upload').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target; // 'image' или 'screenshots'
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            if (target === 'screenshots') input.multiple = true;

            input.onchange = async () => {
                const files = input.files;
                if (!files.length) return;

                // Для одного файла (image)
                if (target === 'image') {
                    const file = files[0];
                    const res = await uploadFile(file, 'image');
                    if (res.success) {
                        const imageInput = container.querySelector('[name="image"]');
                        imageInput.value = res.url;
                    } else {
                        alert('Ошибка загрузки: ' + (res.error || ''));
                    }
                }
                // Для нескольких файлов (screenshots)
                else if (target === 'screenshots') {
                    const textarea = container.querySelector('[name="screenshots"]');
                    let urls = textarea.value.split('\n').map(s => s.trim()).filter(s => s);

                    for (const file of files) {
                        const res = await uploadFile(file, 'screenshots');
                        if (res.success) {
                            urls.push(res.url);
                        } else {
                            alert('Ошибка загрузки: ' + (res.error || ''));
                            break;
                        }
                    }
                    textarea.value = urls.join('\n');
                }
            };
            input.click();
        });
    });

    document.getElementById('proj-form').onsubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        data.id = parseInt(data.id);
        
        // Нормализация image
        if (data.image) {
            data.image = data.image.replace(/\\/g, '/');
            if (!/^(\/|https?:\/\/)/.test(data.image)) data.image = '/' + data.image;
        }

        data.screenshots = data.screenshots
        .split('\n')
        .map(s => {
            s = s.trim().replace(/\\/g, '/');
            if (s && !/^(\/|https?:\/\/)/.test(s)) s = '/' + s;
            return s;
        })
        .filter(s => s);

        const method = id ? 'PUT' : 'POST';
        const res = await api('/projects.php', { method, body: JSON.stringify(data) });
        if (res.success) {
            document.getElementById('edit-form-container').innerHTML = '';
            const projects = await api('/projects.php');
            renderProjects(projects);
        } else alert('Ошибка: ' + (res.error || ''));
    };
}

async function deleteProject(id) {
    if (!confirm('Удалить проект?')) return;
    const res = await api(`/projects.php?id=${id}`, { method: 'DELETE' });
    if (res.success) {
        const projects = await api('/projects.php');
        renderProjects(projects);
    } else alert('Ошибка удаления');
}

async function logout() {
    await api('/logout.php');
    showLogin();
}

// Старт
(async () => {
    if (await checkAuth()) showPanel();
    else showLogin();
})();