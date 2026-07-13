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
                <textarea name="fullDescription" rows="8">${escapeHtml(project.fullDescription)}</textarea>
            </div>
            <div class="form-group">
                <label>Скриншоты (по URL на строку)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <textarea name="screenshots" rows="5" style="flex: 1;">${escapeHtml(project.screenshots)}</textarea>
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