// импортируем показ уведомлений запросы к товарам и добавление в корзину
import { showToast } from './toast.js';
import { getProducts, getProductById, IMAGE_BASE_URL } from './api.js';
import { handleAddToCart } from './cart.js';

// сколько карточек показывать на одной странице каталога
const ITEMS_PER_PAGE = 9;
// обязательные поля которые мы ждем в объекте товара от бэкенда
const REQUIRED_FIELDS = ['id', 'name', 'price', 'rating', 'image'];
// список поддерживаемых css модификаторов для кнопок цвета
const SUPPORTED_COLORS = ['green', 'red', 'yellow', 'orange', 'cyan', 'blue', 'purple', 'pink', 'white', 'black'];
// текущая открытая страница в каталоге
let currentPage = 1;

// картинка заглушка в формате svg если фото товара не загрузилось
const PLACEHOLDER_SVG =
    'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22295%22%20height%3D%22298%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23F0EEED%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23888888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

// проверяем что сервер прислал все нужные поля у товара и предупреждаем в консоль если чего то не хватает
function validateProduct(product, index) {
    // filter оставляет только те названия полей которых нет в объекте product
    const missingFields = REQUIRED_FIELDS.filter(
        field => product[field] === undefined || product[field] === null
    );

    if (missingFields.length > 0) {
        console.warn(
            `товар #${index} (id: ${product.id ?? 'нет'}) отсутствуют поля: [${missingFields.join(', ')}]`,
            product
        );
    }
}

// собирает html разметку звезд рейтинга по числу (например 4.5 превратится в 4 полные и 1 половинку)
function renderStars(rating = 0) {
    // Math.floor отбрасывает дробную часть чтобы узнать количество целых звезд
    const fullStars = Math.floor(rating);
    // проверяем остаток от деления на 1 если он больше или равен 0.5 добавляем половину звезды
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

// записываем обработчик ошибки загрузки картинки в window чтобы вызывать его прямо из атрибута onerror в html
window.handleImageError = function (imgElement, productId, productName, requestedSrc) {
    // обнуляем onerror чтобы браузер не ушел в бесконечный цикл если заглушка тоже не откроется
    imgElement.onerror = null;
    console.warn(`нет фото для товара #${productId} (${productName}): ${requestedSrc}`);
    imgElement.src = PLACEHOLDER_SVG;
    imgElement.alt = `нет изображения (${productName})`;
};

// собирает полный путь до картинки товара на сервере
function getProductImageUrl(imageField) {
    if (!imageField) return PLACEHOLDER_SVG;
    // если в имени файла с бэкенда уже есть точка (например 1.png) оставляем как есть иначе дописываем .png
    const imageName = imageField.includes('.') ? imageField : `${imageField}.png`;
    return `${IMAGE_BASE_URL}/${imageName}`;
}

// собирает html разметку одной карточки товара для главной страницы каталога и похожих товаров
function createProductCard(product, index) {
    validateProduct(product, index);

    const imageSrc = getProductImageUrl(product.image);
    // Boolean проверяет есть ли у товара одновременно и процент скидки и старая цена
    const hasDiscount = Boolean(product.discount && product.oldPrice);
    // экранируем одинарные кавычки в названии чтобы не сломать атрибут onerror в разметке
    const safeName = (product.name || 'товар').replace(/'/g, "\\'");
    // берем первый доступный размер и цвет для быстрого добавления из карточки
    const defaultSize = Array.isArray(product.sizes) && product.sizes.length ? product.sizes[0] : 'Large';
    const defaultColor = Array.isArray(product.colors) && product.colors.length ? product.colors[0] : 'black';

    return `
        <li class="product-grid__item" data-id="${product.id}">
            <article class="product-card">
                <div class="product-card__thumb">
                    <img 
                        src="${imageSrc}" 
                        alt="${product.alt || product.name || 'товар'}"
                        onerror="window.handleImageError(this, ${product.id}, '${safeName}', '${imageSrc}')"
                    >
                </div>
                <h3 class="product-card__title">
                    <a href="Product.html?id=${product.id}">${product.name || 'без названия'}</a>
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
                <button 
                    type="button" 
                    class="product-card__add-btn" 
                    data-action="add-to-cart"
                    data-product-id="${product.id}"
                    data-size="${defaultSize}"
                    data-color="${defaultColor}"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span>Add to Cart</span>
                </button>
            </article>
        </li>
    `;
}

// делегирование клика по кнопке добавления в корзину внутри любой карточки товара
function initCardCartEvents() {
    document.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('[data-action="add-to-cart"]');
        if (!addBtn) return;

        await handleAddToCart({
            productId: Number(addBtn.dataset.productId),
            size: addBtn.dataset.size,
            color: addBtn.dataset.color,
            quantity: 1,
            button: addBtn,
        });
    });
}

// --- логика главной страницы (index.html) ---

// загружает подборку товаров (новинки или хиты продаж) в нужный контейнер на главной
async function loadHomeSection(containerId, params) {
    const container = document.getElementById(containerId);
    // если такого блока на текущей странице нет просто выходим
    if (!container) return;

    try {
        container.innerHTML = '<li class="loading">загрузка товаров...</li>';
        const response = await getProducts(params);
        const products = response.items || [];

        if (products.length === 0) {
            container.innerHTML = '<li class="empty">товары не найдены</li>';
            return;
        }
        // превращаем массив товаров в массив html строк и склеиваем в одну строку через join
        container.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
    } catch (error) {
        console.error(`ошибка загрузки блока #${containerId}:`, error);
        container.innerHTML = '<li class="error">не удалось загрузить подборку товаров</li>';
        showToast('ошибка загрузки товаров с сервера', 'error');
    }
}

// циклическая прокрутка отзывов по клику на стрелки влево и вправо на главной странице
function initReviewsSlider() {
    const list = document.getElementById('reviewsList');
    const prevBtn = document.querySelector('.reviews__arrow--prev');
    const nextBtn = document.querySelector('.reviews__arrow--next');
    if (!list || !prevBtn || !nextBtn) return;

    function updateSideBlur() {
        const cards = Array.from(list.querySelectorAll('.review-card'));
        cards.forEach((card, idx) => {
            const isEdge = idx === 0 || idx === cards.length - 1;
            card.classList.toggle('review-card--side', isEdge);
        });
    }

    nextBtn.addEventListener('click', () => {
        if (list.firstElementChild) {
            list.appendChild(list.firstElementChild);
            updateSideBlur();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (list.lastElementChild) {
            list.prepend(list.lastElementChild);
            updateSideBlur();
        }
    });
}

// --- логика каталога (Category.html) ---

// формирует массив номеров страниц для пагинации с многоточием если страниц больше 7
function getPageNumbers(current, total) {
    if (total <= 7) {
        // Array.from создает массив чисел от 1 до total
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3 || current >= total - 2) {
        return [1, 2, 3, '...', total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

// отрисовывает кнопки страниц внизу каталога и блокирует стрелки на первой и последней странице
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

// обновляет текст счетчика показанных товаров (например Showing 1-9 of 24 Products)
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

// загружает нужную страницу товаров в каталоге
async function loadCatalogPage(page = 1) {
    const productsContainer = document.getElementById('productsContainer');
    if (!productsContainer) return;

    try {
        productsContainer.innerHTML = '<li class="loading">загрузка каталога...</li>';

        const response = await getProducts({ page, limit: ITEMS_PER_PAGE });
        const products = response.items || [];
        const total = response.total ?? products.length;
        // Math.ceil округляет вверх чтобы даже для 1 лишнего товара создалась новая страница
        const totalPages = response.pages ?? Math.ceil(total / ITEMS_PER_PAGE);

        currentPage = response.page || page;

        if (products.length === 0) {
            productsContainer.innerHTML = '<li class="empty">товары не найдены</li>';
            updateCatalogMeta(1, ITEMS_PER_PAGE, 0, 0);
            renderPagination(1, 0);
            return;
        }

        productsContainer.innerHTML = products.map((p, idx) => createProductCard(p, idx)).join('');
        updateCatalogMeta(currentPage, ITEMS_PER_PAGE, total, products.length);
        renderPagination(currentPage, totalPages);
    } catch (error) {
        console.error('ошибка загрузки каталога:', error);
        productsContainer.innerHTML = '<li class="error">не удалось загрузить товары с сервера</li>';
        showToast('не удалось загрузить каталог товаров', 'error');
    }
}

// вешает клики на стрелки и номера страниц пагинации через делегирование событий
function initPaginationEvents() {
    const paginationNav = document.querySelector('.pagination');
    if (!paginationNav) return;

    paginationNav.addEventListener('click', (e) => {
        const prevBtn = e.target.closest('.pagination__arrow--prev');
        const nextBtn = e.target.closest('.pagination__arrow--next');
        const numBtn = e.target.closest('.pagination__num');

        if (prevBtn && !prevBtn.disabled) {
            loadCatalogPage(currentPage - 1);
            // плавно прокручиваем страницу в самый верх при смене страницы каталога
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

// --- детальная страница товара (Product.html?id=...) ---

// переключение активной миниатюры в галерее товара
function initGalleryThumbs(mainImageEl) {
    const thumbBtns = document.querySelectorAll('.product-view__thumb-btn');
    if (!thumbBtns.length || !mainImageEl) return;

    thumbBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            thumbBtns.forEach((b) => b.classList.remove('product-view__thumb-btn--active'));
            btn.classList.add('product-view__thumb-btn--active');
            const thumbImg = btn.querySelector('img');
            if (thumbImg && thumbImg.src) {
                mainImageEl.src = thumbImg.src;
            }
        });
    });
}

// переключение вкладок Product Details / Rating & Reviews / FAQs
function initProductTabs() {
    const tabBtns = document.querySelectorAll('.details-tabs__tab');
    const panels = {
        details: document.getElementById('tabPanelDetails'),
        reviews: document.getElementById('tabPanelReviews'),
        faqs: document.getElementById('tabPanelFaqs'),
    };
    if (!tabBtns.length) return;

    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            tabBtns.forEach((b) => b.classList.remove('details-tabs__tab--active'));
            btn.classList.add('details-tabs__tab--active');

            Object.entries(panels).forEach(([key, panelEl]) => {
                if (panelEl) panelEl.hidden = key !== target;
            });
        });
    });
}

// загружает один товар по id из адресной строки и настраивает вкладки цвета размеры и корзину
async function initProductDetailPage() {
    const titleEl = document.getElementById('productTitle');
    // если заголовка товара нет значит мы не на странице Product.html
    if (!titleEl) return;

    // достаем параметр id из адресной строки браузера (например из Product.html?id=5)
    const params = new URLSearchParams(window.location.search);
    const productId = Number(params.get('id')) || 1;

    // переменные для хранения текущего выбора пользователя
    let selectedColor = '';
    let selectedSize = '';
    let quantity = 1;

    const productViewSection = document.getElementById('productViewSection');
    const detailsTabsSection = document.getElementById('detailsTabsSection');
    const tabPanelReviews = document.getElementById('tabPanelReviews');
    const productErrorState = document.getElementById('productErrorState');
    const productErrorText = document.getElementById('productErrorText');

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

    initGalleryThumbs(mainImageEl);
    initProductTabs();

    try {
        // запрашиваем данные конкретного товара с бэкенда
        const product = await getProductById(productId);
        const imageSrc = getProductImageUrl(product.image);
        const safeName = (product.name || 'Product').replace(/'/g, "\\'");

        // подставляем название товара во вкладку браузера хлебные крошки и заголовок
        document.title = `SHOP.CO - ${product.name}`;
        if (breadcrumbEl) breadcrumbEl.textContent = product.category || product.name;
        titleEl.textContent = product.name;

        // обновляем главное фото и миниатюры слева
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

        // заполняем звезды рейтинг цену и описание
        if (starsEl) starsEl.innerHTML = renderStars(product.rating || 0);
        if (ratingValEl) ratingValEl.innerHTML = `${product.rating ?? 0}/<span class="product-view__score-max">5</span>`;
        if (priceEl) priceEl.textContent = `$${product.price}`;

        // если у товара есть скидка показываем старую цену и бейдж иначе скрываем их
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

        // заполняем вкладку Product Details характеристиками товара с сервера
        const tabDescEl = document.getElementById('tabDetailsDescription');
        const tabSpecsEl = document.getElementById('tabDetailsSpecs');
        const colorsList = Array.isArray(product.colors) && product.colors.length ? product.colors : ['Black'];
        const sizesList = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ['Large'];

        if (tabDescEl) {
            tabDescEl.textContent = product.description || 'High quality everyday garment crafted with care.';
        }
        if (tabSpecsEl) {
            tabSpecsEl.innerHTML = `
                <li><span>Category</span><strong>${product.category || 'Casual'}</strong></li>
                <li><span>Style</span><strong>${product.style || 'Casual'}</strong></li>
                <li><span>Available Sizes</span><strong>${sizesList.join(', ')}</strong></li>
                <li><span>Available Colors</span><strong>${colorsList.join(', ')}</strong></li>
                <li><span>Rating</span><strong>${product.rating ?? 0} / 5</strong></li>
                <li><span>Article ID</span><strong>#${product.id}</strong></li>
            `;
        }

        // отрисовываем доступные цвета товара через БЭМ модификаторы без инлайн стилей
        selectedColor = colorsList[0];
        if (colorPickerEl) {
            colorPickerEl.innerHTML = colorsList.map((color, idx) => {
                const normalized = color.toLowerCase();
                const colorModifier = SUPPORTED_COLORS.includes(normalized)
                    ? `color-btn--${normalized}`
                    : 'color-btn--black';
                const checkStroke = normalized === 'white' ? 'black' : 'white';
                return `
                    <button 
                        type="button" 
                        class="color-btn ${colorModifier} ${idx === 0 ? 'color-btn--active' : ''}" 
                        data-color="${color}" 
                        aria-label="${color}"
                        title="${color}"
                    >
                        ${idx === 0 ? `<svg class="color-btn__check" width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="${checkStroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
                    </button>
                `;
            }).join('');

            // переключение активного цвета по клику
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

        // отрисовываем доступные размеры товара и выбираем первый по умолчанию
        selectedSize = sizesList[0];
        if (sizePickerEl) {
            sizePickerEl.innerHTML = sizesList.map((size, idx) => `
                <button type="button" class="size-btn ${idx === 0 ? 'size-btn--active' : ''}" data-size="${size}">${size}</button>
            `).join('');

            // переключение активного размера по клику
            sizePickerEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.size-btn');
                if (!btn) return;
                selectedSize = btn.dataset.size;
                sizePickerEl.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('size-btn--active'));
                btn.classList.add('size-btn--active');
            });
        }

        // кнопки уменьшения и увеличения количества перед добавлением в корзину
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

        // отправка выбранного товара размера цвета и количества в корзину
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

        // похожие товары: сначала берем из той же категории и если меньше 4 — добиваем из общего списка
        const relatedGrid = document.getElementById('relatedProductsGrid');
        if (relatedGrid) {
            const relatedRes = await getProducts({ category: product.category, limit: 5 });
            let relatedItems = (relatedRes.items || []).filter((item) => item.id !== product.id);

            if (relatedItems.length < 4) {
                const fallbackRes = await getProducts({ limit: 8 });
                const usedIds = new Set([product.id, ...relatedItems.map((i) => i.id)]);
                const extraItems = (fallbackRes.items || []).filter((item) => !usedIds.has(item.id));
                relatedItems = [...relatedItems, ...extraItems];
            }

            relatedGrid.innerHTML = relatedItems
                .slice(0, 4)
                .map((p, idx) => createProductCard(p, idx))
                .join('');
        }
    } catch (error) {
        console.error('ошибка загрузки страницы товара:', error);
        if (productViewSection) productViewSection.hidden = true;
        if (detailsTabsSection) detailsTabsSection.hidden = true;
        if (tabPanelReviews) tabPanelReviews.hidden = true;
        if (productErrorState) productErrorState.hidden = false;
        if (productErrorText) {
            productErrorText.textContent = `Не удалось загрузить товар #${productId}: ${error.message}`;
        }
        showToast('не удалось загрузить информацию о товаре', 'error');
    }
}

// общая точка запуска всех функций для товаров на страницах
function initApp() {
    initCardCartEvents();
    initReviewsSlider();
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