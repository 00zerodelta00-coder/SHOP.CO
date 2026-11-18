// время через которое уведомление само закроется в миллисекундах (4 секунды)
const TOAST_DURATION = 4000;
// время за которое проходит css анимация исчезновения
const TOAST_ANIMATION_MS = 250;

// функция ищет общий контейнер для уведомлений или создает его если его еще нет на странице
function getToastContainer() {
    // ищем на странице блок по id
    let container = document.getElementById('toastContainer');
    if (!container) {
        // createElement создает новый пустой тег div в памяти браузера
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        // appendChild вставляет созданный div в конец тега body на самой странице
        document.body.appendChild(container);
    }
    return container;
}

// функция плавно скрывает уведомление и удаляет его из html разметки
function removeToast(toastEl) {
    // записываем в data атрибут dataset.closing флаг чтобы при повторном клике на крестик удаление не запустилось второй раз
    if (!toastEl || toastEl.dataset.closing === 'true') return;
    toastEl.dataset.closing = 'true';

    // classList меняет css классы у элемента чтобы запустилась анимация исчезновения
    toastEl.classList.remove('toast--visible');
    toastEl.classList.add('toast--hiding');

    // setTimeout откладывает выполнение кода на 250 мс пока доиграет css анимация а потом remove() полностью удаляет тег из dom
    setTimeout(() => {
        toastEl.remove();
    }, TOAST_ANIMATION_MS);
}

// export делает функцию showToast доступной для импорта в других js файлах через import
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
    if (!message) return;

    // получаем общий контейнер куда будем складывать плашки стопкой
    const container = getToastContainer();

    // создаем элемент самого уведомления и подставляем тип (success error warning info) в класс по бэм
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    // innerHTML записывает внутрь блока разметку с текстом и кнопкой крестика
    toast.innerHTML = `
        <span class="toast__message">${message}</span>
        <button type="button" class="toast__close" aria-label="закрыть">&times;</button>
    `;

    // вставляем новое уведомление в общий контейнер на страницу
    container.appendChild(toast);

    // ставим минимальную задержку 10 мс через setTimeout чтобы браузер успел отрисовать блок в скрытом виде и плавно применил класс видимости
    setTimeout(() => {
        toast.classList.add('toast--visible');
    }, 10);

    // setTimeout запускает таймер и сохраняет его номер в timerId чтобы потом его можно было отменить
    const timerId = setTimeout(() => {
        removeToast(toast);
    }, duration);

    // находим кнопку крестика внутри этого уведомления через querySelector
    const closeBtn = toast.querySelector('.toast__close');
    // addEventListener вешает обработчик клика на крестик
    closeBtn.addEventListener('click', () => {
        // clearTimeout отменяет автоматический таймер по его id раз пользователь уже сам нажал закрыть
        clearTimeout(timerId);
        removeToast(toast);
    });
}

// записываем функцию в глобальный объект window чтобы ее можно было вызвать из любого места даже без импорта
window.showToast = showToast;