const initialData = require('../data/mock');

const STORE_KEY = 'zht_store_v1';
const STORE_VERSION = 10;

const TEMP_IMAGE_PATCH = {
  p_1: {
    mainImage: '/assets/temp/product-luchang.jpg',
    detailImages: ['/assets/temp/product-luchang.jpg']
  },
  p_2: {
    mainImage: '/assets/temp/product-squid.jpg',
    detailImages: ['/assets/temp/product-squid.jpg']
  },
  p_3: {
    mainImage: '/assets/temp/product-gongcai.jpg',
    detailImages: ['/assets/temp/product-gongcai.jpg']
  },
  p_4: {
    mainImage: '/assets/temp/product-egg.jpg',
    detailImages: ['/assets/temp/product-egg.jpg']
  },
  p_5: {
    mainImage: '/assets/temp/product-fishbag.jpg',
    detailImages: ['/assets/temp/product-fishbag.jpg']
  },
  p_6: {
    mainImage: '/assets/temp/product-fishbag.jpg',
    detailImages: ['/assets/temp/product-fishbag.jpg']
  },
  p_7: {
    mainImage: '/assets/temp/product-dougan.jpg',
    detailImages: ['/assets/temp/product-dougan.jpg']
  },
  p_8: {
    mainImage: '/assets/temp/product-luchang.jpg',
    detailImages: ['/assets/temp/product-luchang.jpg']
  },
  p_9: {
    mainImage: '/assets/temp/product-luchang.jpg',
    detailImages: ['/assets/temp/product-luchang.jpg']
  },
  p_10: {
    mainImage: '/assets/temp/product-gongcai.jpg',
    detailImages: ['/assets/temp/product-gongcai.jpg']
  },
  p_11: {
    mainImage: '/assets/temp/product-egg.jpg',
    detailImages: ['/assets/temp/product-egg.jpg']
  },
  p_12: {
    mainImage: '/assets/temp/product-dougan.jpg',
    detailImages: ['/assets/temp/product-dougan.jpg']
  },
  p_13: {
    mainImage: '/assets/temp/product-gongcai.jpg',
    detailImages: ['/assets/temp/product-gongcai.jpg']
  },
  p_14: {
    mainImage: '/assets/temp/product-fishbag.jpg',
    detailImages: ['/assets/temp/product-fishbag.jpg']
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedStore() {
  const existing = wx.getStorageSync(STORE_KEY);
  if (!existing) {
    const seeded = clone(initialData);
    seeded.__version = STORE_VERSION;
    wx.setStorageSync(STORE_KEY, seeded);
    return;
  }
  if ((existing.__version || 1) < STORE_VERSION) {
    migrateStore(existing);
    wx.setStorageSync(STORE_KEY, existing);
  }
}

function migrateStore(store) {
  if (Array.isArray(store.products)) {
    store.products = store.products.map((product) => ({
      ...product,
      ...(TEMP_IMAGE_PATCH[product.id] || {})
    }));
  }
  store.homeContent = {
    ...(store.homeContent || {}),
    notice: '欢迎光临前呈似景供应链商城，如遇货品搜索不到请联系客服：13243592231',
    heroImage: '/assets/temp/home-hero.jpg',
    topicImage: '/assets/temp/topic-new.jpg',
    logoImage: '/assets/temp/logo.jpg'
  };
  if (Array.isArray(store.orders)) {
    store.orders = store.orders.map((order) => ({
      settlementStatus: 'pending',
      ...order
    }));
  }
  if (Array.isArray(store.cart)) {
    const existingCartIds = new Set(store.cart.map((item) => item.id));
    initialData.cart.forEach((cartItem) => {
      if (!existingCartIds.has(cartItem.id)) store.cart.push(clone(cartItem));
    });
  }
  if (Array.isArray(store.users)) {
    const existingUserIds = new Set(store.users.map((item) => item.id));
    initialData.users.forEach((user) => {
      if (!existingUserIds.has(user.id)) store.users.push(clone(user));
    });
  }
  if (Array.isArray(store.products)) {
    const existingProductIds = new Set(store.products.map((item) => item.id));
    initialData.products.forEach((product) => {
      if (!existingProductIds.has(product.id)) store.products.push(clone(product));
    });
  }
  if (Array.isArray(store.addresses)) {
    const existingAddressIds = new Set(store.addresses.map((item) => item.id));
    initialData.addresses.forEach((address) => {
      if (!existingAddressIds.has(address.id)) store.addresses.push(clone(address));
    });
  }
  if (Array.isArray(store.orders)) {
    const existingOrderIds = new Set(store.orders.map((item) => item.id));
    initialData.orders.forEach((order) => {
      if (!existingOrderIds.has(order.id)) store.orders.push(clone(order));
    });
  }
  if (Array.isArray(store.auditLogs)) {
    const existingAuditIds = new Set(store.auditLogs.map((item) => item.id));
    initialData.auditLogs.forEach((audit) => {
      if (!existingAuditIds.has(audit.id)) store.auditLogs.push(clone(audit));
    });
  }
  if (Array.isArray(store.operationLogs)) {
    const existingOpIds = new Set(store.operationLogs.map((item) => item.id));
    initialData.operationLogs.forEach((log) => {
      if (!existingOpIds.has(log.id)) store.operationLogs.push(clone(log));
    });
  }
  store.__version = STORE_VERSION;
}

function getStore() {
  seedStore();
  return wx.getStorageSync(STORE_KEY);
}

function setStore(nextStore) {
  wx.setStorageSync(STORE_KEY, nextStore);
}

function updateStore(mutator) {
  const store = getStore();
  const result = mutator(store);
  setStore(store);
  return result;
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function nowText() {
  const date = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

module.exports = {
  clone,
  getStore,
  nextId,
  nowText,
  seedStore,
  setStore,
  updateStore
};
