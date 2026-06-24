function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function imagePath(path, options) {
  return options.includeBundledImages ? path : '';
}

function imageList(paths, options) {
  return options.includeBundledImages ? paths : [];
}

const admins = [
  { id: 'admin_001', phone: '13800000000', role: 'super_admin', status: 'enabled', deleteStatus: 'normal', protected: true, name: '特殊超级管理员', remark: '', createdAt: '2026-05-18 12:00' },
  { id: 'admin_002', phone: '13900000000', role: 'admin', status: 'enabled', deleteStatus: 'normal', protected: false, name: '管理员', remark: '', createdAt: '2026-05-18 12:00' }
];

const users = [
  {
    id: 'user_super',
    openid: '',
    phone: '13800000000',
    nickName: '超级管理员',
    avatar: '',
    role: 'super_admin',
    customerStatus: 'approved',
    company: '前呈似景智链',
    region: '四川省 成都市',
    addressDetail: '前呈似景智链仓配中心',
    remark: '',
    createdAt: '2026-05-18 12:00'
  },
  {
    id: 'user_admin',
    openid: '',
    phone: '13900000000',
    nickName: '管理员',
    avatar: '',
    role: 'admin',
    customerStatus: 'approved',
    company: '前呈似景智链',
    region: '四川省 成都市',
    addressDetail: '前呈似景智链仓配中心',
    remark: '',
    createdAt: '2026-05-18 12:00'
  },
  {
    id: 'user_customer',
    openid: '',
    phone: '13700000000',
    nickName: '老客户',
    avatar: '',
    role: 'customer',
    customerStatus: 'approved',
    company: '小巷串串',
    region: '四川省 成都市 武侯区',
    addressDetail: '火锅街 18 号',
    remark: '常购串串类',
    createdAt: '2026-05-18 12:00'
  },
  {
    id: 'user_customer_2',
    openid: '',
    phone: '13600000000',
    nickName: '新门店',
    avatar: '',
    role: 'customer',
    customerStatus: 'approved',
    company: '江边火锅',
    region: '四川省 成都市 锦江区',
    addressDetail: '东大街 66 号',
    remark: '月结客户，偏好海鲜和鲜切',
    createdAt: '2026-05-19 09:30'
  }
];

const categories = [
  { id: 'cat_1', name: '串串', icon: '', sort: 1, status: 'enabled' },
  { id: 'cat_2', name: '盘菜', icon: '', sort: 2, status: 'enabled' },
  { id: 'cat_3', name: '鲜切', icon: '', sort: 3, status: 'enabled' },
  { id: 'cat_4', name: '海鲜', icon: '', sort: 4, status: 'enabled' },
  { id: 'cat_5', name: '底料', icon: '', sort: 5, status: 'enabled' },
  { id: 'cat_6', name: '调料', icon: '', sort: 6, status: 'enabled' },
  { id: 'cat_7', name: '卤味', icon: '', sort: 7, status: 'enabled' },
  { id: 'cat_8', name: '水发品', icon: '', sort: 8, status: 'enabled' },
  { id: 'cat_9', name: '新品', icon: '', sort: 9, status: 'enabled' },
  { id: 'cat_10', name: '小吃', icon: '', sort: 10, status: 'enabled' }
];

function createProducts(options) {
  return [
  {
    id: 'p_1',
    name: '卤肠头',
    barcode: '690000000001',
    code: 'LCT001',
    simple: 'lct',
    categoryId: 'cat_7',
    mainImage: imagePath('/assets/temp/product-luchang.jpg', options),
    detailImages: imageList(['/assets/temp/product-luchang.jpg'], options),
    spec: '1kg*10包/件',
    unit: '件',
    price: 168,
    stock: 80,
    lockedStock: 0,
    warningStock: 10,
    tags: ['推荐'],
    sort: 1,
    saleStatus: 'on',
    deleteStatus: 'normal',
    description: '适合火锅串串、冒菜，口感厚实，出餐稳定。'
  },
  {
    id: 'p_2',
    name: '网红·糖心鱿鱼',
    barcode: '690000000002',
    code: 'THYY002',
    simple: 'thyy',
    categoryId: 'cat_4',
    mainImage: imagePath('/assets/temp/product-squid.jpg', options),
    detailImages: imageList(['/assets/temp/product-squid.jpg'], options),
    spec: '2斤/包',
    unit: '包',
    price: 58,
    stock: 120,
    lockedStock: 0,
    warningStock: 20,
    tags: ['新品', '热销'],
    sort: 2,
    saleStatus: 'on',
    deleteStatus: 'normal',
    description: '鲜香弹嫩，适合串串、烧烤、火锅配菜。'
  },
  {
    id: 'p_3',
    name: '贡菜',
    barcode: '690000000003',
    code: 'GC003',
    simple: 'gc',
    categoryId: 'cat_2',
    mainImage: imagePath('/assets/temp/product-gongcai.jpg', options),
    detailImages: imageList(['/assets/temp/product-gongcai.jpg'], options),
    spec: '5斤/箱',
    unit: '箱',
    price: 175,
    stock: 9,
    lockedStock: 0,
    warningStock: 10,
    tags: ['推荐'],
    sort: 3,
    saleStatus: 'on',
    deleteStatus: 'normal',
    description: '清脆爽口，适合火锅和串串门店日常备货。'
  },
  {
    id: 'p_12',
    name: '牛油火锅底料',
    barcode: '690000000012',
    code: 'NYDL012',
    simple: 'nydl',
    categoryId: 'cat_5',
    mainImage: imagePath('/assets/temp/product-dougan.jpg', options),
    detailImages: imageList(['/assets/temp/product-dougan.jpg'], options),
    spec: '500g*20袋/箱-门店常备底料',
    unit: '箱',
    price: 198,
    stock: 33,
    lockedStock: 0,
    warningStock: 8,
    tags: ['推荐', '新品'],
    sort: 12,
    saleStatus: 'on',
    deleteStatus: 'normal',
    description: '用于测试底料分类、长规格和搜索命中。'
  }
];
}

function createHomeContents(options) {
  return [
  {
    id: 'home_content',
    storeName: '前呈似景智链',
    businessStatus: '营业中',
    industryScope: '食品饮料',
    operationMode: '批发',
    bannerTitle: '专注火锅串串食材',
    notice: '欢迎光临前呈似景智链商城，如遇货品搜索不到请联系客服：13243592231',
    servicePhone: '13243592231',
    heroImage: imagePath('/assets/temp/home-hero.jpg', options),
    topicImage: imagePath('/assets/temp/topic-new.jpg', options),
    logoImage: imagePath('/assets/temp/logo.jpg', options),
    recommendedProductIds: ['p_2', 'p_3', 'p_12'],
    newProductIds: ['p_2', 'p_12']
  }
];
}

const carts = [
  { id: 'cart_001', userId: 'user_customer', productId: 'p_2', quantity: 2, checked: true },
  { id: 'cart_002', userId: 'user_customer', productId: 'p_3', quantity: 1, checked: true }
];

const addresses = [
  {
    id: 'addr_1',
    userId: 'user_customer',
    contactName: '小巷串串',
    phone: '13700000000',
    region: '四川省 成都市 武侯区',
    detail: '火锅街 18 号',
    isDefault: true
  },
  {
    id: 'addr_2',
    userId: 'user_customer_2',
    contactName: '江边火锅',
    phone: '13600000000',
    region: '四川省 成都市 锦江区',
    detail: '东大街 66 号',
    isDefault: true
  }
];

const orders = [
  {
    id: 'order_001',
    orderNo: 'QCSJZL20260514001',
    userId: 'user_customer',
    customerName: '小巷串串',
    customerPhone: '13700000000',
    addressSnapshot: {
      contactName: '小巷串串',
      phone: '13700000000',
      region: '四川省 成都市 武侯区',
      detail: '火锅街 18 号',
      isDefault: true
    },
    status: 'completed',
    settlementStatus: 'pending',
    amount: 240,
    remark: '先挂账，月底统一结算',
    paymentMethod: 'offline',
    paymentStatus: 'unpaid',
    paymentAmount: 0,
    paymentTime: '',
    paymentNo: '',
    createdAt: '2026-05-14 14:34',
    completedAt: '2026-05-14 17:30'
  },
  {
    id: 'order_002',
    orderNo: 'QCSJZL20260519003',
    userId: 'user_customer_2',
    customerName: '江边火锅',
    customerPhone: '13600000000',
    addressSnapshot: {
      contactName: '江边火锅',
      phone: '13600000000',
      region: '四川省 成都市 锦江区',
      detail: '东大街 66 号',
      isDefault: true
    },
    status: 'pending',
    settlementStatus: 'pending',
    amount: 401,
    remark: '下午 4 点前送达',
    paymentMethod: 'offline',
    paymentStatus: 'unpaid',
    paymentAmount: 0,
    paymentTime: '',
    paymentNo: '',
    createdAt: '2026-05-19 09:20',
    completedAt: ''
  }
];

function createOrderItems(options) {
  return [
  {
    id: 'oi_001',
    orderId: 'order_001',
    orderNo: 'QCSJZL20260514001',
    productId: 'p_2',
    productName: '烧烤豆干10片装15cm*15cm',
    spec: '30袋/份',
    unit: '袋',
    mainImage: imagePath('/assets/temp/product-dougan.jpg', options),
    price: 8,
    quantity: 30,
    subtotal: 240
  },
  {
    id: 'oi_002',
    orderId: 'order_002',
    orderNo: 'QCSJZL20260519003',
    productId: 'p_2',
    productName: '网红·糖心鱿鱼',
    spec: '2斤/包',
    unit: '包',
    mainImage: imagePath('/assets/temp/product-squid.jpg', options),
    price: 58,
    quantity: 4,
    subtotal: 232
  },
  {
    id: 'oi_003',
    orderId: 'order_002',
    orderNo: 'QCSJZL20260519003',
    productId: 'p_3',
    productName: '贡菜',
    spec: '5斤/箱',
    unit: '箱',
    mainImage: imagePath('/assets/temp/product-gongcai.jpg', options),
    price: 169,
    quantity: 1,
    subtotal: 169
  }
];
}

const audit_logs = [
  {
    id: 'audit_001',
    type: 'product_update',
    targetCollection: 'products',
    targetId: 'p_3',
    submitterId: 'user_admin',
    submitterName: '管理员',
    submittedAt: '2026-05-23 09:20',
    status: 'pending',
    reviewerId: '',
    reviewerName: '',
    reviewedAt: '',
    beforeData: {
      price: 175,
      stock: 9,
      warningStock: 10,
      saleStatus: 'on',
      categoryId: 'cat_2'
    },
    afterData: {
      price: 169,
      stock: 18,
      warningStock: 12,
      saleStatus: 'on',
      categoryId: 'cat_2'
    },
    summary: '修改商品：贡菜',
    rejectReason: ''
  }
];

const operation_logs = [
  {
    id: 'op_001',
    operatorId: 'user_admin',
    operatorName: '管理员',
    type: 'customer_review',
    target: '13700000000',
    summary: '通过客户看价申请',
    createdAt: '2026-05-20 09:10'
  }
];

const message_settings = [];

function getSeedData(options = {}) {
  const normalizedOptions = {
    includeBundledImages: !!options.includeBundledImages
  };

  const collectionSeedMap = {
    admins,
    users,
    categories,
    products: createProducts(normalizedOptions),
    orders,
    order_items: createOrderItems(normalizedOptions),
    carts,
    addresses,
    audit_logs,
    home_contents: createHomeContents(normalizedOptions),
    message_settings,
    operation_logs
  };

  return clone(collectionSeedMap);
}

module.exports = {
  getSeedData
};

