const { getStore, updateStore, nextId, nowText, clone } = require('./store');
const { getCurrentUser } = require('./auth');

function visibleProducts() {
  return getStore().products
    .filter((item) => item.deleteStatus !== 'deleted' && item.saleStatus === 'on')
    .sort((a, b) => a.sort - b.sort);
}

function findProduct(id) {
  return getStore().products.find((item) => item.id === id);
}

function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, (product.stock || 0) - (product.lockedStock || 0));
}

function addToCart(productId, quantity = 1) {
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

function safeAddToCart(productId, quantity = 1) {
  try {
    return addToCart(productId, quantity);
  } catch (error) {
    if (error && error.message === '库存不足') {
      return { ok: false, message: '库存不足' };
    }
    throw error;
  }
}

function getCartItems() {
  const user = getCurrentUser();
  if (!user) return [];
  const store = getStore();
  return store.cart
    .filter((item) => item.userId === user.id)
    .map((item) => ({ ...item, product: store.products.find((product) => product.id === item.productId) }))
    .filter((item) => item.product);
}

function updateCartQuantity(cartId, quantity) {
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

function createAudit(type, targetCollection, targetId, beforeData, afterData, summary) {
  const user = getCurrentUser();
  return updateStore((store) => {
    const audit = {
      id: nextId('audit'),
      type,
      targetCollection,
      targetId,
      submitterId: user ? user.id : '',
      submitterName: user ? user.nickName : '系统',
      submittedAt: nowText(),
      status: 'pending',
      reviewerId: '',
      reviewerName: '',
      reviewedAt: '',
      beforeData: beforeData ? clone(beforeData) : null,
      afterData: afterData ? clone(afterData) : null,
      summary,
      rejectReason: ''
    };
    store.auditLogs.unshift(audit);
    return audit;
  });
}

function writeOperation(type, target, summary) {
  const user = getCurrentUser();
  updateStore((store) => {
    store.operationLogs.unshift({
      id: nextId('op'),
      operatorId: user ? user.id : '',
      operatorName: user ? user.nickName : '系统',
      type,
      target,
      summary,
      createdAt: nowText()
    });
  });
}

module.exports = {
  addToCart: safeAddToCart,
  createAudit,
  findProduct,
  getAvailableStock,
  getCartItems,
  updateCartQuantity,
  visibleProducts,
  writeOperation
};
