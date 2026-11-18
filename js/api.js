// константы с адресом сервера и ключами для localStorage чтобы не дублировать их по коду
export const BASE_URL = 'http://localhost:8000';
export const IMAGE_BASE_URL = `${BASE_URL}/static/images`;
export const TOKEN_KEY = 'accessToken';
export const USER_KEY = 'userData';

// --- запросы для товаров

// получаем список товаров с фильтрами или пагинацией
export async function getProducts(params = {}) {
    // URLSearchParams превращает объект { page: 1 limit: 9 } в строку запроса "page=1&limit=9"
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/products?${query}` : '/products';
    // await ждет пока выполнится запрос и вернет готовый ответ от сервера
    return await request(endpoint);
}

// получаем один конкретный товар по его id для детальной страницы
export async function getProductById(id) {
    return await request(`/products/${id}`);
}

// --- запросы для авторизации ---

// регистрация нового пользователя отправляем данные методом POST
export async function registerUser({ name, email, password }) {
    return await request('/auth/register', {
        method: 'POST',
        // JSON.stringify превращает js объект в json строку для отправки на сервер
        body: JSON.stringify({ name, email, password }),
    });
}

// вход в аккаунт по почте и паролю
export async function loginUser({ email, password }) {
    return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

// получение данных текущего авторизованного пользователя по токену
export async function getMe() {
    return await request('/auth/me');
}

// --- запросы для корзины (crud) ---

// read получение всей корзины пользователя с сервера
export async function getCart() {
    return await request('/cart');
}

// create добавление нового товара в корзину
export async function addToCartApi({ productId, size, color, quantity = 1 }) {
    return await request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, size, color, quantity }),
    });
}

// update изменение количества конкретного товара в корзине через PATCH
export async function updateCartItemApi(itemId, quantity) {
    return await request(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
    });
}

// delete удаление одной позиции из корзины по ее id
export async function deleteCartItemApi(itemId) {
    return await request(`/cart/items/${itemId}`, {
        method: 'DELETE',
    });
}

// очистка всей корзины (используем при оформлении заказа)
export async function clearCartApi() {
    return await request('/cart', {
        method: 'DELETE',
    });
}

// --- общая функция отправки запросов на бэкенд ---

// async говорит что функция асинхронная и всегда возвращает промис
async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    // достаем токен из памяти браузера по константе TOKEN_KEY
    const token = localStorage.getItem(TOKEN_KEY);

    // собираем заголовки запроса указываем что общаемся в формате json
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // если пользователь вошел и токен есть прикрепляем его в заголовок Authorization для доступа к корзине
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // try catch перехватывает сетевые ошибки например если сервер упал или нет интернета
    try {
        // fetch отправляет сам http запрос на сервер и ждет ответа
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // response.ok проверяет что статус ответа успешный (от 200 до 299)
        if (!response.ok) {
            // пытаемся прочитать текст ошибки от бэкенда если json сломан вернется пустой объект
            const errorData = await response.json().catch(() => ({}));
            // throw прерывает выполнение и пробрасывает ошибку дальше в блок catch
            throw new Error(errorData.detail || `ошибка сервера: ${response.status}`);
        }

        // response.json() парсит ответ сервера из json строки обратно в обычный js объект
        return await response.json();
    } catch (error) {
        console.error(`ошибка при запросе ${endpoint}`, error.message);
        // пробрасываем ошибку выше чтобы ее поймали в auth.js cart.js или product.js и показали toast
        throw error;
    }
}