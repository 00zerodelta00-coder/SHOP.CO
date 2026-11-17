import { showToast } from './toast.js';
import { registerUser, loginUser, TOKEN_KEY, USER_KEY } from './api.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Сохранение сессии
function saveAuthSession(data) {
    if (data.accessToken) {
        localStorage.setItem(TOKEN_KEY, data.accessToken);
    }
    if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
}

// Проверка и показ отложенного уведомления после редиректа
function checkPendingToast() {
    const raw = sessionStorage.getItem('toastOnLoad');
    if (!raw) return;
    sessionStorage.removeItem('toastOnLoad');
    try {
        const { message, type } = JSON.parse(raw);
        showToast(message, type);
    } catch {
        // ignore
    }
}

// Выход из аккаунта
export function logoutUser() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.setItem('toastOnLoad', JSON.stringify({
        message: 'Вы вышли из аккаунта',
        type: 'info',
    }));
    window.location.href = 'login.html';
}

// Отображение ошибки конкретного поля
function setFieldError(fieldId, errorId, message) {
    const fieldEl = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);
    if (fieldEl) {
        fieldEl.classList.toggle('auth-field--error', Boolean(message));
    }
    if (errorEl) {
        errorEl.textContent = message || '';
    }
}

// Общая серверная ошибка формы
function setServerError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('auth-form__server-error--visible', Boolean(message));
}

// Обновление шапки сайта (ссылка на вход для гостя / имя + выход для авторизованного)
function updateHeaderAuth() {
    const actionsContainer = document.querySelector('.header__actions');
    if (!actionsContainer) return;

    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    // Удаляем старый блок авторизации, если перерисовываем
    const oldAuth = actionsContainer.querySelector('.header__auth');
    if (oldAuth) oldAuth.remove();

    // Находим иконку профиля и заменяем/дополняем её
    const profileLink = actionsContainer.querySelector('a[aria-label="profile"], a[aria-label="аккаунт"]');

    if (token) {
        if (profileLink) profileLink.style.display = 'none';

        const authWrap = document.createElement('div');
        authWrap.className = 'header__auth';
        authWrap.innerHTML = `
            <span class="header__auth-user">${user?.name || user?.email || 'Account'}</span>
            <button type="button" class="header__auth-btn" id="headerLogoutBtn">Logout</button>
        `;
        actionsContainer.appendChild(authWrap);

        const logoutBtn = document.getElementById('headerLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logoutUser);
        }
    } else if (profileLink) {
        profileLink.style.display = '';
        profileLink.href = 'login.html';
        profileLink.title = 'Sign In';
    }
}

// Логика страницы входа (login.html)
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setServerError('loginServerError', '');

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        if (!email) {
            setFieldError('emailField', 'loginEmailError', 'Введите email');
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError('emailField', 'loginEmailError', 'Некорректный формат email');
            isValid = false;
        } else {
            setFieldError('emailField', 'loginEmailError', '');
        }

        if (!password) {
            setFieldError('passwordField', 'loginPasswordError', 'Введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setFieldError('passwordField', 'loginPasswordError', 'Пароль должен быть не короче 6 символов');
            isValid = false;
        } else {
            setFieldError('passwordField', 'loginPasswordError', '');
        }

        if (!isValid) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            const response = await loginUser({ email, password });
            saveAuthSession(response);
            sessionStorage.setItem('toastOnLoad', JSON.stringify({
                message: 'Вы успешно вошли в аккаунт',
                type: 'success',
            }));
            window.location.href = 'index.html';
        } catch (error) {
            const msg = error.message || 'Неверный email или пароль';
            setServerError('loginServerError', msg);
            showToast(msg, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
}

// Логика страницы регистрации (register.html)
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const confirmInput = document.getElementById('registerConfirmPassword');
    const submitBtn = document.getElementById('registerSubmitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setServerError('registerServerError', '');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;
        let isValid = true;

        if (!name) {
            setFieldError('nameField', 'registerNameError', 'Введите ваше имя');
            isValid = false;
        } else {
            setFieldError('nameField', 'registerNameError', '');
        }

        if (!email) {
            setFieldError('emailField', 'registerEmailError', 'Введите email');
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError('emailField', 'registerEmailError', 'Некорректный формат email');
            isValid = false;
        } else {
            setFieldError('emailField', 'registerEmailError', '');
        }

        if (!password) {
            setFieldError('passwordField', 'registerPasswordError', 'Введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setFieldError('passwordField', 'registerPasswordError', 'Пароль должен быть не короче 6 символов');
            isValid = false;
        } else {
            setFieldError('passwordField', 'registerPasswordError', '');
        }

        if (!confirmPassword) {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', 'Повторите пароль');
            isValid = false;
        } else if (password !== confirmPassword) {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', 'Пароли не совпадают');
            isValid = false;
        } else {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', '');
        }

        if (!isValid) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            const response = await registerUser({ name, email, password });
            saveAuthSession(response);
            sessionStorage.setItem('toastOnLoad', JSON.stringify({
                message: 'Регистрация прошла успешно!',
                type: 'success',
            }));
            window.location.href = 'index.html';
        } catch (error) {
            const msg = error.message || 'Не удалось зарегистрироваться';
            setServerError('registerServerError', msg);
            showToast(msg, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    });
}

function initAuth() {
    checkPendingToast();
    updateHeaderAuth();
    initLoginForm();
    initRegisterForm();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}