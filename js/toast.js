const TOAST_DURATION = 4000;
const TOAST_ANIMATION_MS = 250;

function getToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        document.body.appendChild(container);
    }
    return container;
}

function removeToast(toastEl) {
    if (!toastEl || toastEl.dataset.closing === 'true') return;
    toastEl.dataset.closing = 'true';
    toastEl.classList.remove('toast--visible');
    toastEl.classList.add('toast--hiding');

    setTimeout(() => {
        toastEl.remove();
    }, TOAST_ANIMATION_MS);
}

/**
 * Показывает всплывающее уведомление
 * @param {string} message - Текст сообщения
 * @param {'success' | 'error' | 'warning' | 'info'} [type='info'] - Тип уведомления
 * @param {number} [duration=4000] - Время показа в мс
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
    if (!message) return;

    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');

    const textSpan = document.createElement('span');
    textSpan.className = 'toast__message';
    textSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', 'Закрыть уведомление');
    closeBtn.innerHTML = '&times;';

    toast.append(textSpan, closeBtn);
    container.appendChild(toast);

    // Плавное появление на следующем кадре отрисовки
    requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
    });

    const timerId = setTimeout(() => {
        removeToast(toast);
    }, duration);

    closeBtn.addEventListener('click', () => {
        clearTimeout(timerId);
        removeToast(toast);
    });
}

window.showToast = showToast;