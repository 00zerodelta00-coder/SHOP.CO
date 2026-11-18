// импортируем функцию показа всплывающих уведомлений и методы api с константами ключей
import { showToast } from './toast.js';
import { registerUser, loginUser, TOKEN_KEY, USER_KEY } from './api.js';

// регулярное выражение для проверки что в email есть символ @ и точка в домене
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// сохраняем токен доступа и данные пользователя в localStorage после успешного входа или регистрации
function saveAuthSession(data) {
    if (data.accessToken) {
        // localStorage.setItem записывает строку в память браузера которая не пропадает после перезагрузки страницы
        localStorage.setItem(TOKEN_KEY, data.accessToken);
    }
    if (data.user) {
        // localStorage хранит только строки поэтому объект user переводим в json через JSON.stringify
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
}

// проверяем не оставили ли мы сообщение перед редиректом на другую страницу
function checkPendingToast() {
    // sessionStorage работает как localStorage но очищается при закрытии вкладки
    const raw = sessionStorage.getItem('toastOnLoad');
    if (!raw) return;

    // сразу удаляем запись чтобы уведомление не всплывало повторно при обновлении страницы
    sessionStorage.removeItem('toastOnLoad');
    try {
        // JSON.parse превращает сохраненную строку обратно в объект с полями message и type
        const { message, type } = JSON.parse(raw);
        showToast(message, type);
    } catch {
        // если в хранилище попал битый json просто игнорируем ошибку
    }
}

// export делает функцию выхода доступной для вызова из других модулей
export function logoutUser() {
    // removeItem удаляет токен и данные пользователя из памяти браузера
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // сохраняем текст тоста в sessionStorage потому что сразу после редиректа текущая страница перезагрузится
    sessionStorage.setItem('toastOnLoad', JSON.stringify({
        message: 'вы вышли из аккаунта',
        type: 'info',
    }));

    // window.location.href перенаправляет браузер на страницу входа
    window.location.href = 'login.html';
}

// подсвечивает конкретное поле формы красным и выводит текст ошибки под ним
function setFieldError(fieldId, errorId, message) {
    const fieldEl = document.getElementById(fieldId);
    const errorEl = document.getElementById(errorId);
    if (fieldEl) {
        // classList.toggle добавляет класс ошибки если message не пустой и убирает если пустой
        fieldEl.classList.toggle('auth-field--error', Boolean(message));
    }
    if (errorEl) {
        errorEl.textContent = message || '';
    }
}

// показывает общую плашку ошибки от сервера над формой
function setServerError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('auth-form__server-error--visible', Boolean(message));
}

// обновляет правую часть шапки в зависимости от того вошел пользователь или нет
function updateHeaderAuth() {
    const actionsContainer = document.querySelector('.header__actions');
    if (!actionsContainer) return;

    // читаем токен и данные юзера из памяти браузера
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    let user = null;

    try {
        user = userRaw ? JSON.parse(userRaw) : null;
    } catch {
        user = null;
    }

    // если блок авторизации уже был нарисован ранее удаляем его перед перерисовкой
    const oldAuth = actionsContainer.querySelector('.header__auth');
    if (oldAuth) oldAuth.remove();

    // ищем стандартную иконку профиля в шапке
    const profileLink = actionsContainer.querySelector('a[aria-label="profile"], a[aria-label="аккаунт"]');

    if (token) {
        // если токен есть скрываем иконку профиля и вместо нее выводим имя пользователя и кнопку выхода
        if (profileLink) profileLink.style.display = 'none';

        const authWrap = document.createElement('div');
        authWrap.className = 'header__auth';
        authWrap.innerHTML = `
            <span class="header__auth-user">${user?.name || user?.email || 'Account'}</span>
            <button type="button" class="header__auth-btn" id="headerLogoutBtn">Logout</button>
        `;
        actionsContainer.appendChild(authWrap);

        // вешаем выход из аккаунта на созданную кнопку Logout
        const logoutBtn = document.getElementById('headerLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logoutUser);
        }
    } else if (profileLink) {
        // если токена нет оставляем иконку профиля и ставим ей ссылку на страницу входа
        profileLink.style.display = '';
        profileLink.href = 'login.html';
        profileLink.title = 'Sign In';
    }
}

// логика работы формы входа на странице login.html
function initLoginForm() {
    const form = document.getElementById('loginForm');
    // если мы сейчас не на странице входа просто выходим из функции
    if (!form) return;

    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = document.getElementById('loginSubmitBtn');

    // слушаем событие отправки формы submit
    form.addEventListener('submit', async (e) => {
        // preventDefault отменяет стандартную перезагрузку страницы браузером при отправке формы
        e.preventDefault();
        setServerError('loginServerError', '');

        // trim() убирает случайные пробелы по краям введенного email
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        let isValid = true;

        // клиентская валидация email перед отправкой на сервер
        if (!email) {
            setFieldError('emailField', 'loginEmailError', 'введите email');
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError('emailField', 'loginEmailError', 'некорректный формат email');
            isValid = false;
        } else {
            setFieldError('emailField', 'loginEmailError', '');
        }

        // клиентская валидация пароля
        if (!password) {
            setFieldError('passwordField', 'loginPasswordError', 'введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setFieldError('passwordField', 'loginPasswordError', 'пароль должен быть не короче 6 символов');
            isValid = false;
        } else {
            setFieldError('passwordField', 'loginPasswordError', '');
        }

        // если хоть одно поле не прошло проверку запрос на сервер не отправляем
        if (!isValid) return;

        try {
            // блокируем кнопку на время запроса чтобы нельзя было нажать ее несколько раз подряд
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing in...';

            // отправляем запрос на бэкенд и ждем ответ с токеном
            const response = await loginUser({ email, password });
            saveAuthSession(response);

            sessionStorage.setItem('toastOnLoad', JSON.stringify({
                message: 'вы успешно вошли в аккаунт',
                type: 'success',
            }));
            window.location.href = 'index.html';
        } catch (error) {
            const msg = error.message || 'неверный email или пароль';
            setServerError('loginServerError', msg);
            showToast(msg, 'error');
        } finally {
            // блок finally сработает в любом случае и вернет кнопку в исходное состояние
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
}

// логика работы формы регистрации на странице register.html
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

        // проверяем что имя заполнено
        if (!name) {
            setFieldError('nameField', 'registerNameError', 'введите ваше имя');
            isValid = false;
        } else {
            setFieldError('nameField', 'registerNameError', '');
        }

        // проверяем корректность email через регулярку
        if (!email) {
            setFieldError('emailField', 'registerEmailError', 'введите email');
            isValid = false;
        } else if (!EMAIL_REGEX.test(email)) {
            setFieldError('emailField', 'registerEmailError', 'некорректный формат email');
            isValid = false;
        } else {
            setFieldError('emailField', 'registerEmailError', '');
        }

        // проверяем длину пароля (минимум 6 символов по требованиям бэкенда)
        if (!password) {
            setFieldError('passwordField', 'registerPasswordError', 'введите пароль');
            isValid = false;
        } else if (password.length < 6) {
            setFieldError('passwordField', 'registerPasswordError', 'пароль должен быть не короче 6 символов');
            isValid = false;
        } else {
            setFieldError('passwordField', 'registerPasswordError', '');
        }

        // проверяем что повтор пароля совпадает с основным
        if (!confirmPassword) {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', 'повторите пароль');
            isValid = false;
        } else if (password !== confirmPassword) {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', 'пароли не совпадают');
            isValid = false;
        } else {
            setFieldError('confirmPasswordField', 'registerConfirmPasswordError', '');
        }

        if (!isValid) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            // отправляем данные регистрации и сразу сохраняем полученную сессию
            const response = await registerUser({ name, email, password });
            saveAuthSession(response);

            sessionStorage.setItem('toastOnLoad', JSON.stringify({
                message: 'регистрация прошла успешно',
                type: 'success',
            }));
            window.location.href = 'index.html';
        } catch (error) {
            const msg = error.message || 'не удалось зарегистрироваться';
            setServerError('registerServerError', msg);
            showToast(msg, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    });
}

// закрытие верхней рекламной плашки по клику на крестик и запоминание в sessionStorage
function initTopBar() {
    const topBar = document.querySelector('.top-bar');
    if (!topBar) return;

    // если пользователь уже закрывал плашку в этой вкладке сразу скрываем ее
    if (sessionStorage.getItem('topBarClosed') === 'true') {
        topBar.style.display = 'none';
        return;
    }

    const closeBtn = topBar.querySelector('.top-bar__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            topBar.style.display = 'none';
            sessionStorage.setItem('topBarClosed', 'true');
        });
    }
}
// запускаем все функции авторизации при загрузке страницы
function initAuth() {
    checkPendingToast();
    updateHeaderAuth();
    initLoginForm();
    initRegisterForm();
    initAuth();
}

// ждем полной загрузки html дерева (DOMContentLoaded) перед тем как искать элементы на странице
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}