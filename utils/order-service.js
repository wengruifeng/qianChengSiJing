const { cloudFirst } = require('./cloud');
const { getStore, updateStore, nextId, nowText, clone } = require('./store');
const { getCurrentUser } = require('./auth');
const { fetchCartItems } = require('./cart-service');

function getAvailableStock(product) {
  if (!product) return 0;
  return Math.max(0, (product.stock || 0) - (product.lockedStock || 0));
}

const statusMap = {
  pending: '待确认',
  confirmed: '已确认',
  delivering: '配送中',
  completed: '已完成',
  cancelled: '已取消'
};

const settlementMap = {
  pending: '待结算',
  settled: '已结算'
};

function decorateOrder(order, items) {
  const orderItems = items || order.items || [];
  return {
    ...order,
    items: orderItems,
    statusText: statusMap[order.status] || '',
    statusClass: `status-${order.status}`,
    settlementText: settlementMap[order.settlementStatus] || '待结算',
    settlementClass: `settlement-${order.settlementStatus || 'pending'}`,
    totalQty: orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    goodsCount: orderItems.length,
    firstGoodsText: orderItems.map((item) => item.productName).join('、'),
    goodsText: orderItems.map((item) => `${item.productName}×${item.quantity}`).join('，'),
    remarkText: order.remark || '无备注',
    addressText: order.addressSnapshot ? `${order.addressSnapshot.region} ${order.addressSnapshot.detail}` : ''
  };
}

function createOrderMock({ address, remark, items }) {
  const user = getCurrentUser();
  if (!user) throw new Error('请先登录');
  if (!items.length) throw new Error('请先选择商品');
  if (!address) throw new Error('请选择收货地址');
  const insufficient = items.find((item) => getAvailableStock(item.product) < item.quantity);
  if (insufficient) throw new Error(`${insufficient.product.name}库存不足`);

  let orderRecord = null;
  updateStore((store) => {
    const orderId = nextId('order');
    const orderNo = `QCSJZL${Date.now()}`;
    const amount = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderItems = items.map((item) => ({
      id: nextId('oi'),
      orderId,
      orderNo,
      productId: item.product.id,
      productName: item.product.name,
      spec: item.product.spec,
      unit: item.product.unit,
      mainImage: item.product.mainImage,
      price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));
    orderRecord = {
      id: orderId,
      orderNo,
      userId: user.id,
      customerName: user.company || user.nickName,
      customerPhone: user.phone,
      addressSnapshot: clone(address),
      status: 'pending',
      settlementStatus: 'pending',
      amount,
      remark,
      paymentMethod: 'offline',
      paymentStatus: 'unpaid',
      paymentAmount: 0,
      paymentTime: '',
      paymentNo: '',
      createdAt: nowText(),
      completedAt: '',
      items: orderItems
    };
    store.orders.unshift(orderRecord);
    items.forEach((item) => {
      const product = store.products.find((productItem) => productItem.id === item.product.id);
      if (product) product.lockedStock += item.quantity;
    });
    store.cart = store.cart.filter((cart) => !(cart.userId === user.id && cart.checked));
    store.operationLogs.unshift({
      id: nextId('op'),
      operatorId: user.id,
      operatorName: user.nickName,
      type: 'create_order',
      target: orderNo,
      summary: `客户提交订单 ${orderNo}`,
      createdAt: nowText()
    });
  });
  return decorateOrder(orderRecord);
}

function submitOrder({ address, remark }) {
  return fetchCartItems().then((cartItems) => {
    const checkedItems = cartItems.filter((item) => item.checked);
    const payloadItems = checkedItems.map((item) => ({
      cartId: item.id,
      productId: item.product.id,
      quantity: item.quantity
    }));
    return cloudFirst('createOrder', {
      addressId: address && address.id,
      address,
      remark,
      items: payloadItems
    }, () => createOrderMock({ address, remark, items: checkedItems })).then((order) => {
      const user = getCurrentUser();
      if (user) {
        updateStore((store) => {
          store.cart = store.cart.filter((cart) => !(cart.userId === user.id && cart.checked));
        });
      }
      return decorateOrder(order, order.items);
    });
  });
}

function fetchUserOrders() {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([]);
  return fetchAllPagedOrders('listUserOrders', { userId: user.id }, () => {
    return getStore().orders
      .filter((item) => item.userId === user.id)
      .map((item) => decorateOrder(item, item.items));
  });
}

function fetchOrderDetail(id) {
  return cloudFirst('getOrderDetail', { id }, () => {
    const order = getStore().orders.find((item) => item.id === id);
    return order ? decorateOrder(order, order.items) : null;
  }).then((order) => order ? decorateOrder(order, order.items) : null);
}

function confirmReceive(id) {
  return cloudFirst('confirmReceive', { id }, () => {
    updateStore((store) => {
      const order = store.orders.find((item) => item.id === id);
      if (order) {
        order.status = 'completed';
        order.completedAt = nowText();
      }
    });
    const order = getStore().orders.find((item) => item.id === id);
    return order ? decorateOrder(order, order.items) : null;
  });
}

function fetchAdminOrders() {
  return fetchAllPagedOrders('listAdminOrders', {}, () => {
    return getStore().orders.map((order) => decorateOrder(order, order.items));
  });
}

function updateOrderStatus(id, nextStatus) {
  return cloudFirst('updateOrderStatus', { id, nextStatus }, () => {
    updateStore((store) => {
      const order = store.orders.find((item) => item.id === id);
      if (!order) return;
      const oldStatus = order.status;
      if (oldStatus !== 'confirmed' && nextStatus === 'confirmed') {
        order.items.forEach((item) => {
          const product = store.products.find((productItem) => productItem.id === item.productId);
          if (product) {
            product.lockedStock = Math.max(0, product.lockedStock - item.quantity);
            product.stock = Math.max(0, product.stock - item.quantity);
          }
        });
      }
      if (nextStatus === 'cancelled' && oldStatus !== 'confirmed') {
        order.items.forEach((item) => {
          const product = store.products.find((productItem) => productItem.id === item.productId);
          if (product) {
            product.lockedStock = Math.max(0, product.lockedStock - item.quantity);
          }
        });
      }
      order.status = nextStatus;
      if (nextStatus === 'completed') order.completedAt = nowText();
      store.operationLogs.unshift({
        id: nextId('op'),
        operatorId: '',
        operatorName: '后台',
        type: 'order_status',
        target: order.orderNo,
        summary: `订单状态改为${statusMap[nextStatus]}`,
        createdAt: nowText()
      });
    });
    const order = getStore().orders.find((item) => item.id === id);
    return order ? decorateOrder(order, order.items) : null;
  }).then((order) => order ? decorateOrder(order, order.items) : null);
}

function updateSettlementStatus(ids, status) {
  return cloudFirst('updateSettlementStatus', { ids, status }, () => {
    updateStore((store) => {
      store.orders.forEach((order) => {
        if (ids.includes(order.id)) {
          order.settlementStatus = status;
          order.updatedAt = nowText();
        }
      });
    });
    return { ids, status };
  });
}

module.exports = {
  confirmReceive,
  decorateOrder,
  fetchAdminOrders,
  fetchOrderDetail,
  fetchUserOrders,
  settlementMap,
  statusMap,
  submitOrder,
  updateOrderStatus,
  updateSettlementStatus
};

function normalizeOrderPageResult(result) {
  if (Array.isArray(result)) {
    return {
      items: result,
      page: 1,
      pageSize: result.length,
      total: result.length,
      hasMore: false
    };
  }
  return {
    items: result && Array.isArray(result.items) ? result.items : [],
    page: result && result.page ? result.page : 1,
    pageSize: result && result.pageSize ? result.pageSize : 20,
    total: result && typeof result.total === 'number' ? result.total : 0,
    hasMore: !!(result && result.hasMore)
  };
}

function fetchAllPagedOrders(action, payload, fallback) {
  const pageSize = 50;
  return cloudFirst(action, { ...payload, page: 1, pageSize }, fallback).then((firstResult) => {
    const normalizedFirst = normalizeOrderPageResult(firstResult);
    if (!normalizedFirst.hasMore) {
      return normalizedFirst.items.map((item) => decorateOrder(item, item.items));
    }
    const tasks = [];
    for (let page = 2; page <= Math.ceil(normalizedFirst.total / pageSize); page += 1) {
      tasks.push(cloudFirst(action, { ...payload, page, pageSize }, fallback).then(normalizeOrderPageResult));
    }
    return Promise.all(tasks).then((results) => {
      const orders = normalizedFirst.items.concat(results.flatMap((result) => result.items));
      return orders.map((item) => decorateOrder(item, item.items));
    });
  });
}

