export const BASE_URL = 'http://localhost:8000';
export const IMAGE_BASE_URL = `${BASE_URL}/static/images`;
export const TOKEN_KEY = 'accessToken';
export const USER_KEY = 'userData';


export async function getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/products?${query}` : '/products';
    return await request(endpoint);
}

export async function registerUser({name, email, password}) {
    return await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
    });
}

export async function loginUser({ email, password }) {
    return await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function getMe() {
    return await request('/auth/me');
}

async function request(endpoint, options = {}) { // перевод функции в промис
    const url = `${BASE_URL}${endpoint}`;

    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (token) { // проверка на авторизацию
        headers['Authorization'] = `Bearer ${token}`; //
    }

    try { // отправка сетевого запроса, если сети не будет
        const response = await fetch(url, { 
            ...options,
            headers,
        });

        if (!response.ok) { // fetch работает с ошибками
            const errorData = await response.json().catch(() => ({})); // ошибка с пояснением. Если сервер упал полностью то присылает {}
            throw new Error(errorData.detail || `ошибка server: ${response.status}`); // сразу выкидывает ошибку и прерывает код
        }
        return await response.json(); // если все хорошо сработало отправляет успешные данные
    } catch (error) { // любая ошибка которая произошла
        console.error(`ошибка при запросе ${endpoint}`, error.message);
        throw error; // кидаем ошибку дальше
    }
}

// crud



export async function getProductById(id) {
    return await request(`/products/${id}`);
}

export async function getCart() {
    return await request('/cart');
}

export async function addToCartApi({ productId, size, color, quantity = 1 }) {
    return await request('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, size, color, quantity }),
    });
}

export async function updateCartItemApi(itemId, quantity) {
    return await request(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
    });
}

export async function deleteCartItemApi(itemId) {
    return await request(`/cart/items/${itemId}`, {
        method: 'DELETE',
    });
}

export async function clearCartApi() {
    return await request('/cart', {
        method: 'DELETE',
    });
}