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

const PLACEHOLDER_SVG =
    'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22124%22%20height%3D%22124%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EEED%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2212%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

function isAuthenticated() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
}

// Универсальное уведомление (использует showToast, если модуль подключён, или console)
function notify(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
    }
}

// --- CREATE: Добавление товара в корзину с любой страницы ---
export async function handleAddToCart({ productId, size, color, quantity = 1, button = null }) {
    if (!isAuthenticated()) {
        notify('Войдите в аккаунт, чтобы добавлять товары в корзину', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1200);
        return null;
    }

    const originalText = button ? button.textContent : '';
    try {
        if (button) {
            button.disabled = true;
            button.textContent = 'Adding...';
        }

        const updatedCart = await addToCartApi({
            productId: Number(productId),
            size,
            color,
            quantity: Number(quantity),
        });

        notify('Товар добавлен в корзину', 'success');
        return updatedCart;
    } catch (error) {
        if (error.message.includes('401') || error.message.toLowerCase().includes('token')) {
            localStorage.removeItem(TOKEN_KEY);
            notify('Сессия истекла. Войдите снова', 'error');
        } else {
            notify(error.message || 'Не удалось добавить товар в корзину', 'error');
        }
        return null;
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

// --- READ / UPDATE / DELETE: Логика страницы Cart.html ---
function renderEmptyOrGuestState(container, titleText, subtitleText, actionHref, actionLabel) {
    container.innerHTML = `
        <div class="cart-empty" style="text-align: center; padding: 48px 20px;">
            <h3 style="font-size: 22px; font-weight: 700; margin-bottom: 10px;">${titleText}</h3>
            <p style="color: rgba(0,0,0,0.6); margin-bottom: 24px;">${subtitleText}</p>
            <a href="${actionHref}" class="order-summary__checkout-btn" style="display: inline-flex; width: auto; padding: 14px 36px; margin-top: 0;">
                ${actionLabel}
            </a>
        </div>
    `;
}

function updateOrderSummary(cart) {
    const subtotalEl = document.getElementById('summarySubtotal');
    const discountEl = document.getElementById('summaryDiscount');
    const deliveryEl = document.getElementById('summaryDelivery');
    const totalEl = document.getElementById('summaryTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    const subtotal = cart?.subtotal ?? 0;
    const discount = cart?.discount ?? 0;
    const deliveryFee = cart?.deliveryFee ?? 0;
    const total = cart?.total ?? 0;
    const hasItems = Boolean(cart?.items && cart.items.length > 0);

    if (subtotalEl) subtotalEl.textContent = `$${subtotal}`;
    if (discountEl) discountEl.textContent = discount > 0 ? `-$${discount}` : '$0';
    if (deliveryEl) deliveryEl.textContent = `$${deliveryFee}`;
    if (totalEl) totalEl.textContent = `$${total}`;
    if (checkoutBtn) checkoutBtn.disabled = !hasItems;
}

function renderCartItem(item) {
    const product = item.product || {};
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

    container.innerHTML = items
        .map((item) => renderCartItem(item))
        .join('<hr class="cart-items__divider">');
}

async function loadCartPage() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

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
        container.innerHTML = '<p style="padding: 24px; text-align: center;">Loading cart...</p>';
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
            container.innerHTML = `<p style="padding: 24px; text-align: center; color: #FF3333;">Не удалось загрузить корзину: ${error.message}</p>`;
            notify('Ошибка загрузки корзины', 'error');
        }
    }
}

function initCartEvents() {
    const container = document.getElementById('cartItemsContainer');
    if (!container) return;

    // Делегирование событий для кнопок +, - и удаления
    container.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn || actionBtn.disabled) return;

        const itemEl = actionBtn.closest('.cart-item');
        if (!itemEl) return;

        const itemId = Number(itemEl.dataset.cartItemId);
        const action = actionBtn.dataset.action;
        const currentQty = Number(itemEl.querySelector('.quantity-control__value')?.textContent || 1);

        // Блокируем все кнопки внутри карточки на время запроса
        const rowButtons = itemEl.querySelectorAll('button');
        rowButtons.forEach((btn) => (btn.disabled = true));

        try {
            let updatedCart = null;

            if (action === 'increase') {
                if (currentQty >= 99) {
                    notify('Максимальное количество — 99 шт.', 'warning');
                    return;
                }
                updatedCart = await updateCartItemApi(itemId, currentQty + 1);
                notify('Количество обновлено', 'success');
            } else if (action === 'decrease') {
                if (currentQty <= 1) return;
                updatedCart = await updateCartItemApi(itemId, currentQty - 1);
                notify('Количество обновлено', 'success');
            } else if (action === 'delete') {
                updatedCart = await deleteCartItemApi(itemId);
                notify('Товар удалён из корзины', 'info');
            }

            if (updatedCart) {
                renderCart(updatedCart);
            }
        } catch (error) {
            notify(error.message || 'Ошибка при обновлении корзины', 'error');
            rowButtons.forEach((btn) => (btn.disabled = false));
        }
    });

    // Кнопка оформления заказа (очищает корзину через DELETE /cart)
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (!isAuthenticated()) {
                notify('Войдите в аккаунт для оформления заказа', 'warning');
                return;
            }

            try {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = 'Processing...';
                const emptyCart = await clearCartApi();
                renderCart(emptyCart);
                notify('Заказ успешно оформлен!', 'success');
            } catch (error) {
                notify(error.message || 'Ошибка при оформлении заказа', 'error');
            } finally {
                checkoutBtn.textContent = 'Go to Checkout';
            }
        });
    }
}

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