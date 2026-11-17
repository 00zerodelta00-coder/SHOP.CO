import { showToast } from './toast.js';
import { getProducts, getProductById, IMAGE_BASE_URL } from './api.js';
import { handleAddToCart } from './cart.js';

const ITEMS_PER_PAGE = 9;
const REQUIRED_FIELDS = ['id', 'name', 'price', 'rating', 'image'];
let currentPage = 1;

const PLACEHOLDER_SVG =
    'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22295%22%20height%3D%22298%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EEED%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

// Проверка структуры данных от бэкенда
function validateProduct(product, index) {
    const missingFields = REQUIRED_FIELDS.filter(
        field => product[field] === undefined || product[field] === null
    );

    if (missingFields.length > 0) {
        console.warn(
            `[API Schema Warning] Товар #${index} (id: ${product.id ?? 'нет'}) — отсутствуют поля: [${missingFields.join(', ')}]`,
            product
        );
    }
}

// Генерация SVG-звезд
function renderStars(rating = 0) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let starsHtml = '';

    const starFull = './assest/icons/Star.svg';
    const starHalf = './assest/icons/HalfStar.svg';

    for (let i = 0; i < fullStars; i++) {
        starsHtml += `<img class="star-icon" src="${starFull}" alt="star">`;
    }

    if (hasHalf) {
        starsHtml += `<img class="star-icon" src="${starHalf}" alt="half star">`;
    }

    return starsHtml;
}

// Обработка 404 для отсутствующих фото (10–24)
window.handleImageError = function (imgElement, productId, productName, requestedSrc) {
    imgElement.onerror = null;
    console.warn(`[Asset 404] Нет фото для товара #${productId} ("${productName}"): ${requestedSrc}`);
    imgElement.src = PLACEHOLDER_SVG;
    imgElement.alt = `Нет изображения (${productName})`;
};

function getProductImageUrl(imageField) {
    if (!imageField) return PLACEHOLDER_SVG;
    const imageName = imageField.includes('.') ? imageField : `${imageField}.png`;
    return `${IMAGE_BASE_URL}/${imageName}`;
}

// Шаблон карточки товара (с кнопкой Add to Cart)
function createProductCard(product, index) {
    validateProduct(product, index);

    const imageSrc = getProductImageUrl(product.image);
    const hasDiscount = Boolean(product.discount && product.oldPrice);
    const safeName = (product.name || 'Товар').replace(/'/g, "\\'");

    const defaultSize = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes[0] : 'Large';
    const defaultColor = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors[0] : 'black';

    return `
        <li class="product-grid__item" data-id="${product.id}">
            <article class="product-card">
                <div class="product-card__thumb">
                    <img 
                        src="${imageSrc}" 
                        alt="${product.alt || product.name || 'Товар'}"
                        onerror="window.handleImageError(this, ${product.id}, '${safeName}', '${imageSrc}')"
                    >
                </div>
                <h3 class="product-card__title">
                    <a href="Product.html?id=${product.id}">${product.name || 'Без названия'}</a>
                </h3>
                <div class="product-card__rating">
                    <div class="product-card__stars">
                        ${renderStars(product.rating || 0)}
                    </div>
                    <span class="product-card__score">${product.rating ?? 0}/5</span>
                </div>
                <div class="product-card__pricing">
                    <span class="product-card__price">$${product.price ?? 0}</span>
                    ${hasDiscount ? `
                        <span class="product-card__price--old">$${product.oldPrice}</span>
                        <span class="product-card__badge">-${product.discount}%</span>
                    ` : ''}
                </div>
            </article>
        </li>
    `;
}

// Делегированный клик по кнопке "Add to Cart" на любой карточке товара
function initCardAddToCartEvents() {
    document.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('[data-add-cart-id]');
        if (!addBtn || addBtn.disabled) return;

        e.preventDefault();
        e.stopPropagation();

        await handleAddToCart({
            productId: addBtn.dataset.addCartId,
            size: addBtn.dataset.defaultSize,
            color: addBtn.dataset.defaultColor,
            quantity: 1,
            button: addBtn,
        });
    });
}

// --- ЛОГИКА ГЛАВНОЙ СТРАНИЦЫ (index.html) ---
async function loadHomeSection(containerId, params) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        container.innerHTML = '<li class="loading">Загрузка товаров...</li>';
        const response = await getProducts(params);
        const products = response.items || [];

        if (products.length === 0) {
            container.innerHTML = '<li class="empty">Товары не найдены</li>';
            return;
        }
        container.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
    } catch (error) {
        console.error(`[API error] Ошибка загрузки блока #${containerId}:`, error);
        container.innerHTML = '<li class="error">Не удалось загрузить подборку товаров</li>';
        if (typeof window.showToast === 'function') {
            window.showToast('Ошибка загрузки товаров с сервера', 'error');
        }
    }
}

// --- ЛОГИКА КАТАЛОГА (Category.html) ---
function getPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3 || current >= total - 2) {
        return [1, 2, 3, '...', total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

function renderPagination(page, totalPages) {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    if (totalPages <= 1) {
        paginationNav.style.display = 'none';
        return;
    }
    paginationNav.style.display = 'flex';

    const prevBtn = paginationNav.querySelector('.pagination__arrow--prev');
    const nextBtn = paginationNav.querySelector('.pagination__arrow--next');
    const numbersContainer = paginationNav.querySelector('.pagination__numbers');

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (numbersContainer) {
        const pages = getPageNumbers(page, totalPages);
        numbersContainer.innerHTML = pages.map(item => {
            if (item === '...') {
                return `<span class="pagination__dots">...</span>`;
            }
            const activeClass = item === page ? 'pagination__num--active' : '';
            return `<button type="button" class="pagination__num ${activeClass}" data-page="${item}">${item}</button>`;
        }).join('');
    }
}

function updateCatalogMeta(page, limit, total, itemsCount) {
    const metaText = document.querySelector('.catalog-main__meta p');
    if (!metaText) return;

    if (total === 0) {
        metaText.textContent = 'Showing 0 Products';
        return;
    }

    const start = (page - 1) * limit + 1;
    const end = start + itemsCount - 1;
    metaText.textContent = `Showing ${start}-${end} of ${total} Products`;
}

async function loadCatalogPage(page = 1) {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;

    try {
        productsContainer.innerHTML = '<li class="loading">Загрузка каталога...</li>';

        const response = await getProducts({ page, limit: ITEMS_PER_PAGE });
        const products = response.items || [];
        const total = response.total ?? products.length;
        const totalPages = response.pages ?? Math.ceil(total / ITEMS_PER_PAGE);

        currentPage = response.page || page;

        if (products.length === 0) {
            productsContainer.innerHTML = '<li class="empty">Товары не найдены</li>';
            updateCatalogMeta(1, ITEMS_PER_PAGE, 0, 0);
            renderPagination(1, 0);
            return;
        }

        productsContainer.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
        updateCatalogMeta(currentPage, ITEMS_PER_PAGE, total, products.length);
        renderPagination(currentPage, totalPages);
    } catch (error) {
        console.error('[API Fetch Error] Ошибка загрузки каталога:', error);
        productsContainer.innerHTML = '<li class="error">Не удалось загрузить товары с сервера.</li>';
        if (typeof window.showToast === 'function') {
            window.showToast('Не удалось загрузить каталог товаров', 'error');
        }
    }
}

function initPaginationEvents() {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    paginationNav.addEventListener('click', (e) => {
        const prevBtn = e.target.closest('.pagination__arrow--prev');
        const nextBtn = e.target.closest('.pagination__arrow--next');
        const numBtn = e.target.closest('.pagination__num');

        if (prevBtn && !prevBtn.disabled) {
            loadCatalogPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (nextBtn && !nextBtn.disabled) {
            loadCatalogPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (numBtn) {
            const targetPage = Number(numBtn.dataset.page);
            if (targetPage && targetPage !== currentPage) {
                loadCatalogPage(targetPage);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    });
}

// --- ДЕТАЛЬНАЯ СТРАНИЦА ТОВАРА (Product.html?id=...) ---
const COLOR_HEX_MAP = {
    green: '#00C12B',
    red: '#F50606',
    yellow: '#F5DD06',
    orange: '#F57906',
    cyan: '#06CAF5',
    blue: '#063AF5',
    purple: '#7D06F5',
    pink: '#F506A4',
    white: '#FFFFFF',
    black: '#000000',
};

async function initProductDetailPage() {
    const titleEl = document.getElementById('productTitle');
    if (!titleEl) return; // Мы не на странице Product.html

    const params = new URLSearchParams(window.location.search);
    const productId = Number(params.get('id')) || 1;

    let selectedColor = '';
    let selectedSize = '';
    let quantity = 1;

    const mainImageEl = document.getElementById('mainProductImage');
    const thumbImgs = [
        document.getElementById('thumb1'),
        document.getElementById('thumb2'),
        document.getElementById('thumb3'),
    ];
    const breadcrumbEl = document.getElementById('breadcrumbProductName');
    const starsEl = document.getElementById('productStars');
    const ratingValEl = document.getElementById('productRatingVal');
    const priceEl = document.getElementById('productPrice');
    const oldPriceEl = document.getElementById('productOldPrice');
    const discountEl = document.getElementById('productDiscount');
    const descEl = document.getElementById('productDescription');
    const colorPickerEl = document.getElementById('colorPicker');
    const sizePickerEl = document.getElementById('sizePicker');
    const quantityValEl = document.getElementById('quantityVal');
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const btnAddToCart = document.getElementById('btnAddToCart');

    try {
        const product = await getProductById(productId);
        const imageSrc = getProductImageUrl(product.image);
        const safeName = (product.name || 'Product').replace(/'/g, "\\'");

        document.title = `SHOP.CO - ${product.name}`;
        if (breadcrumbEl) breadcrumbEl.textContent = product.category || product.name;
        titleEl.textContent = product.name;

        if (mainImageEl) {
            mainImageEl.src = imageSrc;
            mainImageEl.alt = product.alt || product.name;
            mainImageEl.onerror = () => window.handleImageError(mainImageEl, product.id, safeName, imageSrc);
        }

        thumbImgs.forEach((thumb) => {
            if (!thumb) return;
            thumb.src = imageSrc;
            thumb.alt = product.alt || product.name;
            thumb.onerror = () => window.handleImageError(thumb, product.id, safeName, imageSrc);
        });

        if (starsEl) starsEl.innerHTML = renderStars(product.rating || 0);
        if (ratingValEl) ratingValEl.innerHTML = `${product.rating ?? 0}/<span class="product-view__score-max">5</span>`;
        if (priceEl) priceEl.textContent = `$${product.price}`;

        if (product.oldPrice && product.discount) {
            if (oldPriceEl) {
                oldPriceEl.style.display = '';
                oldPriceEl.textContent = `$${product.oldPrice}`;
            }
            if (discountEl) {
                discountEl.style.display = '';
                discountEl.textContent = `-${product.discount}%`;
            }
        } else {
            if (oldPriceEl) oldPriceEl.style.display = 'none';
            if (discountEl) discountEl.style.display = 'none';
        }

        if (descEl) descEl.textContent = product.description || '';

        // Отрисовка доступных цветов из бэкенда
        const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : ['black'];
        selectedColor = colors[0];
        if (colorPickerEl) {
            colorPickerEl.innerHTML = colors.map((color, idx) => {
                const bg = COLOR_HEX_MAP[color.toLowerCase()] || color;
                const isWhite = color.toLowerCase() === 'white';
                const borderStyle = isWhite ? 'border: 1px solid rgba(0,0,0,0.2);' : '';
                const checkStroke = isWhite ? 'black' : 'white';
                return `
                    <button 
                        type="button" 
                        class="color-btn ${idx === 0 ? 'color-btn--active' : ''}" 
                        data-color="${color}" 
                        style="background-color: ${bg}; ${borderStyle}" 
                        aria-label="${color}"
                        title="${color}"
                    >
                        ${idx === 0 ? `<svg class="color-btn__check" width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="${checkStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
                    </button>
                `;
            }).join('');

            colorPickerEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.color-btn');
                if (!btn) return;
                selectedColor = btn.dataset.color;
                colorPickerEl.querySelectorAll('.color-btn').forEach((b) => {
                    b.classList.remove('color-btn--active');
                    b.innerHTML = '';
                });
                btn.classList.add('color-btn--active');
                const stroke = selectedColor.toLowerCase() === 'white' ? 'black' : 'white';
                btn.innerHTML = `<svg class="color-btn__check" width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            });
        }

        // Отрисовка доступных размеров из бэкенда
        const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Large'];
        selectedSize = sizes[0];
        if (sizePickerEl) {
            sizePickerEl.innerHTML = sizes.map((size, idx) => `
                <button type="button" class="size-btn ${idx === 0 ? 'size-btn--active' : ''}" data-size="${size}">${size}</button>
            `).join('');

            sizePickerEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.size-btn');
                if (!btn) return;
                selectedSize = btn.dataset.size;
                sizePickerEl.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('size-btn--active'));
                btn.classList.add('size-btn--active');
            });
        }

        // Счётчик количества
        if (btnMinus && quantityValEl) {
            btnMinus.addEventListener('click', () => {
                if (quantity > 1) {
                    quantity -= 1;
                    quantityValEl.textContent = String(quantity);
                }
            });
        }
        if (btnPlus && quantityValEl) {
            btnPlus.addEventListener('click', () => {
                if (quantity < 99) {
                    quantity += 1;
                    quantityValEl.textContent = String(quantity);
                }
            });
        }

        // Добавление в корзину со страницы товара
        if (btnAddToCart) {
            btnAddToCart.addEventListener('click', async () => {
                await handleAddToCart({
                    productId: product.id,
                    size: selectedSize,
                    color: selectedColor,
                    quantity,
                    button: btnAddToCart,
                });
            });
        }

        // Подгружаем блок похожих товаров (You Might Also Like)
        const relatedGrid = document.getElementById('relatedProductsGrid');
        if (relatedGrid) {
            const relatedRes = await getProducts({ category: product.category, limit: 4 });
            const relatedItems = (relatedRes.items || []).filter((item) => item.id !== product.id).slice(0, 4);
            if (relatedItems.length > 0) {
                relatedGrid.innerHTML = relatedItems.map((p, idx) => createProductCard(p, idx)).join('');
            }
        }
    } catch (error) {
        console.error('[Product Detail Error]:', error);
        titleEl.textContent = 'Product not found';
        if (typeof window.showToast === 'function') {
            window.showToast('Не удалось загрузить информацию о товаре', 'error');
        }
    }
}

function initApp() {
    initCardAddToCartEvents();
    initPaginationEvents();
    loadCatalogPage(1);
    initProductDetailPage();

    loadHomeSection('newArrivalsGrid', { page: 1, limit: 4 });
    loadHomeSection('topSellingGrid', { page: 1, limit: 4, sortBy: 'popular', order: 'desc' });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}


