const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function ok(data = {}) {
  return { ok: true, data };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { ok: false, code, message };
}

async function findAdminByPhone(phone) {
  const res = await db.collection('admins').where({ phone, status: 'enabled' }).limit(1).get();
  return res.data[0] || null;
}

async function findUserByPhone(phone) {
  const res = await db.collection('users').where({ phone }).limit(1).get();
  return res.data[0] || null;
}

async function findUserById(id) {
  const res = await db.collection('users').where({ id }).limit(1).get();
  return res.data[0] || null;
}

function nowText() {
  const date = new Date();
  const pad = (n) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nextId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function loginByPhone(payload) {
  const { phone } = payload;
  if (!phone) {
    return fail('手机号不能为空', 'PHONE_REQUIRED');
  }

  const wxContext = cloud.getWXContext();
  const adminRecord = await findAdminByPhone(phone);
  let user = await findUserByPhone(phone);

  if (!user) {
    user = {
      id: nextId('user'),
      openid: wxContext.OPENID || '',
      phone,
      nickName: `客户${phone.slice(-4)}`,
      avatar: '',
      role: adminRecord ? adminRecord.role : 'customer',
      customerStatus: 'not_applied',
      company: '',
      region: '',
      addressDetail: '',
      remark: '',
      createdAt: nowText(),
      updatedAt: nowText()
    };
    await db.collection('users').add({ data: user });
  } else {
    const patch = {
      openid: wxContext.OPENID || user.openid || '',
      updatedAt: nowText()
    };
    if (adminRecord && user.role !== adminRecord.role) {
      patch.role = adminRecord.role;
    }
    await db.collection('users').doc(user._id).update({ data: patch });
    user = {
      ...user,
      ...patch
    };
  }

  return ok({
    user,
    adminRecord
  });
}

async function getCurrentUser(payload) {
  const { userId, phone } = payload;
  let user = null;

  if (userId) user = await findUserById(userId);
  if (!user && phone) user = await findUserByPhone(phone);

  if (!user) {
    return fail('未找到当前用户', 'USER_NOT_FOUND');
  }

  const adminRecord = await findAdminByPhone(user.phone);
  if (adminRecord && user.role !== adminRecord.role) {
    await db.collection('users').doc(user._id).update({
      data: {
        role: adminRecord.role,
        updatedAt: nowText()
      }
    });
    user = {
      ...user,
      role: adminRecord.role,
      updatedAt: nowText()
    };
  }

  return ok({ user });
}

async function listCategories() {
  const res = await db.collection('categories')
    .where({ status: 'enabled' })
    .orderBy('sort', 'asc')
    .limit(100)
    .get();
  return ok(res.data);
}

async function listProducts() {
  const res = await db.collection('products')
    .where({ deleteStatus: 'normal', saleStatus: 'on' })
    .orderBy('sort', 'asc')
    .limit(200)
    .get();
  return ok(res.data);
}

async function listAdminProducts() {
  const res = await db.collection('products')
    .where({ deleteStatus: 'normal' })
    .orderBy('sort', 'asc')
    .limit(200)
    .get();
  return ok(res.data);
}

async function getProduct(payload) {
  const { id } = payload;
  if (!id) return fail('缺少商品 ID', 'PRODUCT_ID_REQUIRED');
  const res = await db.collection('products').where({ id }).limit(1).get();
  if (!res.data.length) return fail('商品不存在', 'PRODUCT_NOT_FOUND');
  return ok(res.data[0]);
}

async function getHomeContent() {
  const res = await db.collection('home_contents').where({ id: 'home_content' }).limit(1).get();
  return ok(res.data[0] || {});
}

async function submitApply(payload) {
  const { company, region, addressDetail } = payload;
  if (!company || !region || !addressDetail) {
    return fail('请填写完整资料', 'APPLY_FIELDS_REQUIRED');
  }
  const wxContext = cloud.getWXContext();
  const userRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
  let user = userRes.data[0] || null;
  if (!user) {
    return fail('未找到当前登录用户', 'CURRENT_USER_NOT_FOUND');
  }
  const patch = {
    company,
    region,
    addressDetail,
    customerStatus: 'pending',
    appliedAt: nowText(),
    updatedAt: nowText()
  };
  await db.collection('users').doc(user._id).update({ data: patch });
  user = { ...user, ...patch };
  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: user.id,
      operatorName: user.nickName,
      type: 'apply_price',
      target: user.phone,
      summary: `${user.company} 提交查看价格申请`,
      createdAt: nowText()
    }
  });
  return ok({ user });
}

async function saveAddress(payload) {
  const { form = {} } = payload;
  const { contactName, phone, region, detail } = form;
  if (!contactName || !phone || !region || !detail) {
    return fail('请填写完整地址', 'ADDRESS_FIELDS_REQUIRED');
  }
  const wxContext = cloud.getWXContext();
  const userRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
  const user = userRes.data[0] || null;
  if (!user) {
    return fail('未找到当前登录用户', 'CURRENT_USER_NOT_FOUND');
  }
  const hasDefaultRes = await db.collection('addresses').where({ userId: user.id, isDefault: true }).count();
  const address = {
    id: nextId('addr'),
    userId: user.id,
    contactName,
    phone,
    region,
    detail,
    isDefault: hasDefaultRes.total === 0,
    createdAt: nowText(),
    updatedAt: nowText()
  };
  await db.collection('addresses').add({ data: address });
  return ok(address);
}

async function listAddresses(payload) {
  const { userId } = payload;
  if (!userId) return fail('缺少用户 ID', 'USER_ID_REQUIRED');
  const res = await db.collection('addresses').where({ userId }).get();
  return ok(res.data);
}

async function listCustomers() {
  const usersRes = await db.collection('users').where({ role: 'customer' }).limit(200).get();
  const ordersRes = await db.collection('orders').limit(500).get();
  const addressesRes = await db.collection('addresses').limit(500).get();
  const users = usersRes.data;
  const orders = ordersRes.data;
  const addresses = addressesRes.data;
  const customers = users.map((item) => {
    const customerOrders = orders.filter((order) => order.userId === item.id);
    const addressCount = addresses.filter((address) => address.userId === item.id).length;
    return {
      ...item,
      displayName: item.company || item.nickName,
      statusText: ({
        not_applied: '未申请',
        pending: '待审核',
        approved: '已通过',
        rejected: '已拒绝'
      })[item.customerStatus] || '未申请',
      statusClass: `status-${item.customerStatus || 'not_applied'}`,
      orderCount: customerOrders.length,
      totalAmount: customerOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0).toFixed(2),
      addressCount
    };
  });
  return ok(customers);
}

async function reviewCustomer(payload) {
  const { id, status } = payload;
  if (!id || !status) return fail('缺少客户审核参数', 'REVIEW_PARAMS_REQUIRED');
  const wxContext = cloud.getWXContext();
  const reviewerRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
  const reviewer = reviewerRes.data[0] || null;
  if (!reviewer) return fail('未找到当前审核人', 'REVIEWER_NOT_FOUND');
  const userRes = await db.collection('users').where({ id }).limit(1).get();
  const user = userRes.data[0] || null;
  if (!user) return fail('未找到客户', 'CUSTOMER_NOT_FOUND');
  const patch = {
    customerStatus: status,
    reviewedAt: nowText(),
    reviewerId: reviewer.id,
    reviewerName: reviewer.nickName,
    updatedAt: nowText()
  };
  await db.collection('users').doc(user._id).update({ data: patch });
  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: reviewer.id,
      operatorName: reviewer.nickName,
      type: 'customer_review',
      target: user.phone,
      summary: `${status === 'approved' ? '通过' : '拒绝'}客户看价申请`,
      createdAt: nowText()
    }
  });
  return ok({ id, status });
}

async function getCustomerDetail(payload) {
  const { id } = payload;
  if (!id) return fail('缺少客户 ID', 'CUSTOMER_ID_REQUIRED');
  const userRes = await db.collection('users').where({ id }).limit(1).get();
  const customer = userRes.data[0] || null;
  if (!customer) return fail('未找到客户', 'CUSTOMER_NOT_FOUND');
  const [ordersRes, addressesRes, logsRes] = await Promise.all([
    db.collection('orders').where({ userId: id }).get(),
    db.collection('addresses').where({ userId: id }).get(),
    db.collection('operation_logs').limit(200).get()
  ]);
  const logs = logsRes.data.filter((item) => item.operatorId === id || item.target === customer.phone).slice(0, 20);
  return ok({
    customer,
    orders: ordersRes.data,
    addresses: addressesRes.data,
    logs
  });
}

async function listOrderItemsByOrderIds(orderIds) {
  if (!orderIds.length) return [];
  const tasks = orderIds.map((id) => db.collection('order_items').where({ orderId: id }).get());
  const results = await Promise.all(tasks);
  return results.flatMap((res) => res.data);
}

function attachItemsToOrders(orders, items) {
  const map = {};
  items.forEach((item) => {
    if (!map[item.orderId]) map[item.orderId] = [];
    map[item.orderId].push(item);
  });
  return orders.map((order) => ({
    ...order,
    items: map[order.id] || []
  }));
}

async function createOrder(payload) {
  const { addressId, address, remark, items = [] } = payload;
  if (!items.length) return fail('请先选择商品', 'ORDER_ITEMS_REQUIRED');

  const wxContext = cloud.getWXContext();
  const userRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
  const user = userRes.data[0] || null;
  if (!user) return fail('未找到当前登录用户', 'CURRENT_USER_NOT_FOUND');

  let addressSnapshot = address || null;
  if (addressId) {
    const addressRes = await db.collection('addresses').where({ id: addressId, userId: user.id }).limit(1).get();
    addressSnapshot = addressRes.data[0] || addressSnapshot;
  }
  if (!addressSnapshot) return fail('请选择收货地址', 'ADDRESS_REQUIRED');

  const orderProducts = [];
  let amount = 0;
  for (const item of items) {
    const productRes = await db.collection('products').where({ id: item.productId, deleteStatus: 'normal', saleStatus: 'on' }).limit(1).get();
    const product = productRes.data[0] || null;
    if (!product) return fail('存在不可下单商品', 'PRODUCT_NOT_FOUND');
    const availableStock = Math.max(0, Number(product.stock || 0) - Number(product.lockedStock || 0));
    if (availableStock < item.quantity) {
      return fail(`${product.name}库存不足`, 'INSUFFICIENT_STOCK');
    }
    orderProducts.push({ product, quantity: item.quantity });
    amount += Number(product.price || 0) * Number(item.quantity || 0);
  }

  const orderId = nextId('order');
  const orderNo = `QCSJ${Date.now()}`;
  const order = {
    id: orderId,
    orderNo,
    userId: user.id,
    customerName: user.company || user.nickName,
    customerPhone: user.phone,
    addressSnapshot,
    status: 'pending',
    settlementStatus: 'pending',
    amount,
    remark: remark || '',
    paymentMethod: 'offline',
    paymentStatus: 'unpaid',
    paymentAmount: 0,
    paymentTime: '',
    paymentNo: '',
    createdAt: nowText(),
    completedAt: ''
  };
  await db.collection('orders').add({ data: order });

  const orderItems = [];
  for (const item of orderProducts) {
    const orderItem = {
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
      subtotal: Number(item.product.price || 0) * Number(item.quantity || 0)
    };
    orderItems.push(orderItem);
    await db.collection('order_items').add({ data: orderItem });
    await db.collection('products').doc(item.product._id).update({
      data: {
        lockedStock: Number(item.product.lockedStock || 0) + Number(item.quantity || 0),
        updatedAt: nowText()
      }
    });
  }

  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: user.id,
      operatorName: user.nickName,
      type: 'create_order',
      target: orderNo,
      summary: `客户提交订单 ${orderNo}`,
      createdAt: nowText()
    }
  });

  return ok({
    ...order,
    items: orderItems
  });
}

async function listUserOrders(payload) {
  const { userId } = payload;
  if (!userId) return fail('缺少用户 ID', 'USER_ID_REQUIRED');
  const res = await db.collection('orders').where({ userId }).get();
  const orders = res.data.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const items = await listOrderItemsByOrderIds(orders.map((item) => item.id));
  return ok(attachItemsToOrders(orders, items));
}

async function getOrderDetail(payload) {
  const { id } = payload;
  if (!id) return fail('缺少订单 ID', 'ORDER_ID_REQUIRED');
  const res = await db.collection('orders').where({ id }).limit(1).get();
  const order = res.data[0] || null;
  if (!order) return fail('订单不存在', 'ORDER_NOT_FOUND');
  const itemRes = await db.collection('order_items').where({ orderId: id }).get();
  return ok({
    ...order,
    items: itemRes.data
  });
}

async function confirmReceive(payload) {
  const { id } = payload;
  if (!id) return fail('缺少订单 ID', 'ORDER_ID_REQUIRED');
  const res = await db.collection('orders').where({ id }).limit(1).get();
  const order = res.data[0] || null;
  if (!order) return fail('订单不存在', 'ORDER_NOT_FOUND');
  const patch = {
    status: 'completed',
    completedAt: nowText()
  };
  await db.collection('orders').doc(order._id).update({ data: patch });
  const itemsRes = await db.collection('order_items').where({ orderId: id }).get();
  return ok({
    ...order,
    ...patch,
    items: itemsRes.data
  });
}

async function listAdminOrders() {
  const res = await db.collection('orders').get();
  const orders = res.data.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const items = await listOrderItemsByOrderIds(orders.map((item) => item.id));
  return ok(attachItemsToOrders(orders, items));
}

async function updateOrderStatus(payload) {
  const { id, nextStatus } = payload;
  if (!id || !nextStatus) return fail('缺少订单状态参数', 'ORDER_STATUS_PARAMS_REQUIRED');
  const orderRes = await db.collection('orders').where({ id }).limit(1).get();
  const order = orderRes.data[0] || null;
  if (!order) return fail('订单不存在', 'ORDER_NOT_FOUND');
  const itemsRes = await db.collection('order_items').where({ orderId: id }).get();
  const items = itemsRes.data;
  const oldStatus = order.status;

  if (oldStatus !== 'confirmed' && nextStatus === 'confirmed') {
    for (const item of items) {
      const productRes = await db.collection('products').where({ id: item.productId }).limit(1).get();
      const product = productRes.data[0] || null;
      if (product) {
        await db.collection('products').doc(product._id).update({
          data: {
            lockedStock: Math.max(0, Number(product.lockedStock || 0) - Number(item.quantity || 0)),
            stock: Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0)),
            updatedAt: nowText()
          }
        });
      }
    }
  }

  if (nextStatus === 'cancelled' && oldStatus !== 'confirmed') {
    for (const item of items) {
      const productRes = await db.collection('products').where({ id: item.productId }).limit(1).get();
      const product = productRes.data[0] || null;
      if (product) {
        await db.collection('products').doc(product._id).update({
          data: {
            lockedStock: Math.max(0, Number(product.lockedStock || 0) - Number(item.quantity || 0)),
            updatedAt: nowText()
          }
        });
      }
    }
  }

  const patch = {
    status: nextStatus,
    updatedAt: nowText()
  };
  if (nextStatus === 'completed') patch.completedAt = nowText();
  await db.collection('orders').doc(order._id).update({ data: patch });

  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: '',
      operatorName: '后台',
      type: 'order_status',
      target: order.orderNo,
      summary: `订单状态改为${({
        pending: '待确认',
        confirmed: '已确认',
        delivering: '配送中',
        completed: '已完成',
        cancelled: '已取消'
      })[nextStatus] || nextStatus}`,
      createdAt: nowText()
    }
  });

  return ok({
    ...order,
    ...patch,
    items
  });
}

exports.main = async (event) => {
  const { action, payload = {} } = event;

  if (action === 'ping') {
    return ok({ time: Date.now() });
  }

  if (action === 'authLoginByPhone') {
    return loginByPhone(payload);
  }

  if (action === 'authGetCurrentUser') {
    return getCurrentUser(payload);
  }

  if (action === 'listProducts') {
    return listProducts(payload);
  }

  if (action === 'listAdminProducts') {
    return listAdminProducts(payload);
  }

  if (action === 'listCategories') {
    return listCategories(payload);
  }

  if (action === 'getProduct') {
    return getProduct(payload);
  }

  if (action === 'getHomeContent') {
    return getHomeContent(payload);
  }

  if (action === 'submitApply') {
    return submitApply(payload);
  }

  if (action === 'saveAddress') {
    return saveAddress(payload);
  }

  if (action === 'listAddresses') {
    return listAddresses(payload);
  }

  if (action === 'listCustomers') {
    return listCustomers(payload);
  }

  if (action === 'reviewCustomer') {
    return reviewCustomer(payload);
  }

  if (action === 'getCustomerDetail') {
    return getCustomerDetail(payload);
  }

  if (action === 'createOrder') {
    return createOrder(payload);
  }

  if (action === 'listUserOrders') {
    return listUserOrders(payload);
  }

  if (action === 'getOrderDetail') {
    return getOrderDetail(payload);
  }

  if (action === 'confirmReceive') {
    return confirmReceive(payload);
  }

  if (action === 'listAdminOrders') {
    return listAdminOrders(payload);
  }

  if (action === 'updateOrderStatus') {
    return updateOrderStatus(payload);
  }

  if (action === 'createAudit') {
    const wxContext = cloud.getWXContext();
    const userRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
    const user = userRes.data[0] || null;
    const audit = {
      id: nextId('audit'),
      type: payload.type,
      targetCollection: payload.targetCollection,
      targetId: payload.targetId,
      submitterId: user ? user.id : '',
      submitterName: user ? user.nickName : '系统',
      submittedAt: nowText(),
      status: 'pending',
      reviewerId: '',
      reviewerName: '',
      reviewedAt: '',
      beforeData: payload.beforeData || null,
      afterData: payload.afterData || null,
      summary: payload.summary || '',
      rejectReason: ''
    };
    await db.collection('audit_logs').add({ data: audit });
    return ok(audit);
  }

  if (action === 'listAudits') {
    const res = await db.collection('audit_logs').get();
    return ok(res.data.sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))));
  }

  if (action === 'reviewAudit') {
    const { id, action: reviewAction, rejectReason } = payload;
    if (!id || !reviewAction) return fail('缺少审核参数', 'AUDIT_PARAMS_REQUIRED');
    const wxContext = cloud.getWXContext();
    const reviewerRes = await db.collection('users').where({ openid: wxContext.OPENID }).limit(1).get();
    const reviewer = reviewerRes.data[0] || null;
    if (!reviewer || reviewer.role !== 'super_admin') return fail('仅超级管理员可审核', 'AUDIT_PERMISSION_DENIED');
    const auditRes = await db.collection('audit_logs').where({ id }).limit(1).get();
    const audit = auditRes.data[0] || null;
    if (!audit) return fail('审核记录不存在', 'AUDIT_NOT_FOUND');
    if (audit.status !== 'pending') return fail('该审核已处理', 'AUDIT_ALREADY_REVIEWED');

    if (reviewAction === 'approve') {
      if (audit.targetCollection === 'products') {
        if (audit.type === 'product_create') {
          const productData = {
            id: nextId('p'),
            ...audit.afterData,
            createdAt: nowText(),
            updatedAt: nowText()
          };
          await db.collection('products').add({ data: productData });
        } else {
          const productRes = await db.collection('products').where({ id: audit.targetId }).limit(1).get();
          const product = productRes.data[0] || null;
          if (product) {
            await db.collection('products').doc(product._id).update({
              data: {
                ...audit.afterData,
                updatedAt: nowText()
              }
            });
          }
        }
      }
      if (audit.targetCollection === 'home_contents' || audit.targetCollection === 'homeContent') {
        const homeRes = await db.collection('home_contents').where({ id: 'home_content' }).limit(1).get();
        const home = homeRes.data[0] || null;
        if (home) {
          await db.collection('home_contents').doc(home._id).update({
            data: {
              ...audit.afterData,
              updatedAt: nowText(),
              updatedBy: reviewer.id
            }
          });
        }
      }
    }

    const patch = {
      status: reviewAction === 'approve' ? 'approved' : 'rejected',
      reviewerId: reviewer.id,
      reviewerName: reviewer.nickName,
      reviewedAt: nowText(),
      rejectReason: reviewAction === 'reject' ? (rejectReason || '后台拒绝') : ''
    };
    await db.collection('audit_logs').doc(audit._id).update({ data: patch });
    return ok({
      ...audit,
      ...patch
    });
  }

  if (action === 'updateSettlementStatus') {
    const { ids = [], status } = payload;
    if (!Array.isArray(ids) || !ids.length || !status) return fail('缺少结算状态参数', 'SETTLEMENT_PARAMS_REQUIRED');
    const ordersRes = await Promise.all(ids.map((id) => db.collection('orders').where({ id }).limit(1).get()));
    for (const orderRes of ordersRes) {
      const order = orderRes.data[0] || null;
      if (!order) continue;
      await db.collection('orders').doc(order._id).update({
        data: {
          settlementStatus: status,
          updatedAt: nowText()
        }
      });
    }
    return ok({ ids, status });
  }

  return fail(`Unknown action: ${action}`, 'UNKNOWN_ACTION');
};
