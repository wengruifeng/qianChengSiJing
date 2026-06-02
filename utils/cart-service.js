const { callCloud, canUseCloud } = require('./cloud');
const { runtime } = require('./config');
const { getStore, updateStore, nextId } = require('./store');
const { getCurrentUser } = require('./auth');
const { findProduct, getAvailableStock } = require('./business');

function cloudFirst(action, payload, fallback) {
  if (runtime.mode === 'cloud-first' && canUseCloud()) {
    return callCloud(action, payload).then((res) => {
      if (res.ok) return res.data;
      if (runtime.fallbackToMock) return fallback();
      throw new Error(res.message || `${action} failed`);
    }).catch((error) => {
      if (runtime.fallbackToMock) return fallback();
      throw error;
    });
  }
  return Promise.resolve(fallback());
}

function enrichLocalCartItem(item, store) {
  const product = store.products.find((current) => current.id === item.productId);
  if (!product) return null;
  return { ...item, product };
}

function addToCartMock(productId, quantity = 1) {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: '请先登录' };
  const product = findProduct(productId);
  if (!product) return { ok: false, message: '商品不存在' };
  const nextQuantity = Number(quantity) || 0;
  const availableStock = getAvailableStock(product);
  if (availableStock <= 0) return { ok: false, message: '商品已售罄' };
  updateStore((store) => {
    const existing = store.cart.find((item) => item.userId === user.id && item.productId === productId);
    const currentQuantity = existing ? existing.quantity : 0;
    if (currentQuantity + nextQuantity > availableStock) {
      throw new Error('库存不足');
    }
    if (existing) {
      existing.quantity += nextQuantity;
    } else {
      store.cart.push({ id: nextId('cart'), userId: user.id, productId, quantity: nextQuantity, checked: true });
    }
  });
  return { ok: true };
}

function addToCart(productId, quantity = 1) {
  return cloudFirst('addToCart', { productId, quantity }, () => addToCartMock(productId, quantity)).catch((error) => {
    if (error && error.message === '库存不足') return { ok: false, message: '库存不足' };
    throw error;
  });
}

function fetchCartItemsMock() {
  const user = getCurrentUser();
  if (!user) return [];
  const store = getStore();
  return store.cart
    .filter((item) => item.userId === user.id)
    .map((item) => enrichLocalCartItem(item, store))
    .filter(Boolean);
}

function fetchCartItems() {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([]);
  return cloudFirst('listCartItems', { userId: user.id }, () => fetchCartItemsMock());
}

function updateCartQuantityMock(cartId, quantity) {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: '请先登录' };
  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity) || nextQuantity < 0) return { ok: false, message: '数量不合法' };
  let result = { ok: true };
  updateStore((store) => {
    const index = store.cart.findIndex((item) => item.id === cartId && item.userId === user.id);
    if (index < 0) return;
    if (nextQuantity === 0) {
      store.cart.splice(index, 1);
      return;
    }
    const cartItem = store.cart[index];
    const product = store.products.find((item) => item.id === cartItem.productId);
    const availableStock = getAvailableStock(product);
    if (nextQuantity > availableStock) {
      result = { ok: false, message: '库存不足', maxQuantity: availableStock };
      return;
    }
    store.cart[index].quantity = nextQuantity;
  });
  return result;
}

function updateCartQuantity(cartId, quantity) {
  return cloudFirst('updateCartQuantity', { cartId, quantity }, () => updateCartQuantityMock(cartId, quantity));
}

module.exports = {
  addToCart,
  fetchCartItems,
  updateCartQuantity
};
