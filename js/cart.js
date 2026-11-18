// импортируем функцию показа уведомлений и все методы для работы с корзиной на сервере
import { showToast } from './toast.js';
import {
    getCart,
    addToCartApi,
    updateCartItemApi,
    deleteCartItemApi,
    clearCartApi,
    IMAGE_BASE_URL,
    TOKEN_KEY,
} from './api.js';

// картинка заглушка в формате svg на случай если у товара нет фото на сервере
const PLACEHOLDER_SVG =
    'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22124%22%20height%3D%22124%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EEED%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

// проверяем авторизован ли пользователь по наличию токена в localStorage
function isAuthenticated() {
    // Boolean() превращает найденную строку токена в true а пустоту (null) в false
    return Boolean(localStorage.getItem(TOKEN_KEY));
}

// export делает функцию добавления в корзину доступной для вызова со страницы товара Product.html
export async function handleAddToCart({ productId, size, color, quantity = 1, button = null }) {
    // без токена сервер не даст добавить товар поэтому сразу просим войти и кидаем на login.html
    if (!isAuthenticated()) {
        showToast('войдите в аккаунт чтобы добавлять товары в корзину', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
        return null;
    }

    // запоминаем исходный текст кнопки чтобы вернуть его обратно после запроса
    const originalText = button ? button.textContent : '';

    try {
        if (button) {
            // блокируем кнопку на время запроса чтобы не отправить товар дважды при двойном клике
            button.disabled = true;
            button.textContent = 'Adding...';
        }

        // отправляем post запрос на добавление товара и ждем обновленную корзину от сервера
        const updatedCart = await addToCartApi({
            productId: Number(productId),
            size,
            color,
            quantity: Number(quantity),
        });

        showToast('товар добавлен в корзину', 'success');
        return updatedCart;
    } catch (error) {
        // если сервер вернул 401 значит токен протух удаляем его и просим перезайти
        if (error.message.includes('401') || error.message.toLowerCase().includes('token')) {
            localStorage.removeItem(TOKEN_KEY);
            showToast('сессия истекла войдите снова', 'error');
        } else {
            showToast(error.message || 'не удалось добавить товар в корзину', 'error');
        }
        return null;
    } finally {
        // блок finally сработает даже при ошибке и разблокирует кнопку
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

// отрисовывает заглушку когда корзина пустая или пользователь не вошел в аккаунт
function renderEmptyOrGuestState(container, titleText, subtitleText, actionHref, actionLabel) {
    container.innerHTML = `
        <div class="cart-empty">
            <h3 class="cart-empty__title">${titleText}</h3>
            <p class="cart-empty__text">${subtitleText}</p>
            <a href="${actionHref}" class="order-summary__checkout-btn cart-empty__btn">
                ${actionLabel}
            </a>
        </div>
    `;
}

// обновляет правый блок Order Summary (подытог скидка доставка и итоговая сумма)
function updateOrderSummary(cart) {
    const subtotalEl = document.getElementById('summarySubtotal');
    const discountEl = document.getElementById('summaryDiscount');
    const deliveryEl = document.getElementById('summaryDelivery');
    const totalEl = document.getElementById('summaryTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    // оператор ?? берет значение справа (0) только если слева пришло null или undefined
    const subtotal = cart?.subtotal ?? 0;
    const discount = cart?.discount ?? 0;
    const deliveryFee = cart?.deliveryFee ?? 0;
    const total = cart?.total ?? 0;
    const hasItems = Boolean(cart?.items && cart.items.length > 0);

    if (subtotalEl) subtotalEl.textContent = `$${subtotal}`;
    if (discountEl) discountEl.textContent = discount > 0 ? `-$${discount}` : '$0';
    if (deliveryEl) deliveryEl.textContent = `$${deliveryFee}`;
    if (totalEl) totalEl.textContent = `$${total}`;
    // если товаров в корзине нет кнопку оформления заказа делаем неактивной
    if (checkoutBtn) checkoutBtn.disabled = !hasItems;
}

// собирает html разметку одной карточки товара в корзине
function renderCartItem(item) {
    const product = item.product || {};
    // если у картинки в базе нет расширения файла дописываем .png
    const imageName = product.image
        ? (product.image.includes('.') ? product.image : `${product.image}.png`)
        : '';
    const imageSrc = imageName ? `${IMAGE_BASE_URL}/${imageName}` : PLACEHOLDER_SVG;

    return `
        <article class="cart-item" data-cart-item-id="${item.id}">
            <div class="cart-item__image-wrap">
                <img 
                    src="${imageSrc}" 
                    alt="${product.alt || product.name || 'Product'}" 
                    class="cart-item__img"
                    onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}';"
                >
            </div>
            <div class="cart-item__content">
                <div class="cart-item__header">
                    <h3 class="cart-item__title">
                        <a href="Product.html?id=${item.productId}">${product.name || 'Product'}</a>
                    </h3>
                    <button type="button" class="cart-item__delete-btn" data-action="delete" aria-label="delete item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF3333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
                <div class="cart-item__meta">
                    <span class="cart-item__prop">Size: <strong class="cart-item__val">${item.size}</strong></span>
                    <span class="cart-item__prop">Color: <strong class="cart-item__val">${item.color}</strong></span>
                </div>
                <div class="cart-item__footer">
                    <span class="cart-item__price">$${item.lineTotal ?? (product.price * item.quantity)}</span>
                    <div class="quantity-control quantity-control--small">
                        <button type="button" class="quantity-control__btn" data-action="decrease" aria-label="decrease quantity" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span class="quantity-control__value">${item.quantity}</span>
                        <button type="button" class="quantity-control__btn" data-action="increase" aria-label="increase quantity" ${item.quantity >= 99 ? 'disabled' : ''}>+</button>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// отрисовывает весь список товаров в корзине и обновляет итоговые суммы
function renderCart(cart) {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    updateOrderSummary(cart);

    const items = cart?.items || [];
    if (items.length === 0) {
        renderEmptyOrGuestState(
            container,
            'Your cart is empty',
            'Looks like you haven’t added anything to your cart yet.',
            'Category.html',
            'Go to Catalog'
        );
        return;
    }

    // map превращает каждый объект товара в строку html а join склеивает их через разделительную линию hr
    container.innerHTML = items
        .map((item) => renderCartItem(item))
        .join('<hr class="cart-items__divider">');
}

// запрашивает корзину с сервера при открытии страницы Cart.html
async function loadCartPage() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    // если пользователь гость не делаем лишний запрос на сервер а сразу предлагаем войти
    if (!isAuthenticated()) {
        updateOrderSummary(null);
        renderEmptyOrGuestState(
            container,
            'Sign in to view your cart',
            'You need to be logged in to access and manage your shopping cart.',
            'login.html',
            'Sign In'
        );
        return;
    }

    try {
        container.innerHTML = '<p class="cart-items__status">Loading cart...</p>';
        const cart = await getCart();
        renderCart(cart);
    } catch (error) {
        console.error('[Cart Load Error]:', error);
        if (error.message.includes('401')) {
            localStorage.removeItem(TOKEN_KEY);
            renderEmptyOrGuestState(
                container,
                'Session expired',
                'Please sign in again to load your cart.',
                'login.html',
                'Sign In'
            );
        } else {
            container.innerHTML = `<p class="cart-items__status cart-items__status--error">не удалось загрузить корзину: ${error.message}</p>`;
            showToast('ошибка загрузки корзины', 'error');
        }
    }
}

// вешает обработчики кликов на кнопки + - удаление и оформление заказа
function initCartEvents() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    // делегирование событий вешаем один обработчик на весь контейнер вместо каждой отдельной кнопки
    container.addEventListener('click', async (e) => {
        // closest ищет ближайшую родительскую кнопку с атрибутом data-action
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn || actionBtn.disabled) return;

        // находим саму карточку товара чтобы достать ее id из data-cart-item-id
        const itemEl = actionBtn.closest('.cart-item');
        if (!itemEl) return;

        const itemId = Number(itemEl.dataset.cartItemId);
        const action = actionBtn.dataset.action;
        const currentQty = Number(itemEl.querySelector('.quantity-control__value')?.textContent || 1);

        // блокируем все кнопки внутри этой строки на время запроса к серверу
        const rowButtons = itemEl.querySelectorAll('button');
        rowButtons.forEach((btn) => (btn.disabled = true));

        try {
            let updatedCart = null;

            if (action === 'increase') {
                if (currentQty >= 99) {
                    showToast('максимальное количество 99 шт', 'warning');
                    rowButtons.forEach((btn) => (btn.disabled = false));
                    return;
                }
                updatedCart = await updateCartItemApi(itemId, currentQty + 1);
                showToast('количество обновлено', 'success');
            } else if (action === 'decrease') {
                if (currentQty <= 1) return;
                updatedCart = await updateCartItemApi(itemId, currentQty - 1);
                showToast('количество обновлено', 'success');
            } else if (action === 'delete') {
                updatedCart = await deleteCartItemApi(itemId);
                showToast('товар удален из корзины', 'info');
            }

            // перерисовываем корзину по свежим данным которые вернул бэкенд
            if (updatedCart) {
                renderCart(updatedCart);
            }
        } catch (error) {
            showToast(error.message || 'ошибка при обновлении корзины', 'error');
            rowButtons.forEach((btn) => (btn.disabled = false));
        }
    });

    // кнопка оформления заказа очищает корзину на сервере через DELETE /cart
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (!isAuthenticated()) {
                showToast('войдите в аккаунт для оформления заказа', 'warning');
                return;
            }

            try {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Processing...';
                const emptyCart = await clearCartApi();
                renderCart(emptyCart);
                showToast('заказ успешно оформлен', 'success');
            } catch (error) {
                showToast(error.message || 'ошибка при оформлении заказа', 'error');
            } finally {
                checkoutBtn.textContent = 'Go to Checkout';
            }
        });
    }
}

// инициализация страницы корзины
function initCartPage() {
    if (!document.getElementById('cartItemsContainer')) return;
    initCartEvents();
    loadCartPage();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartPage);
} else {
    initCartPage();
}