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

  if (action === 'createAudit') {
    const wxContext = cloud.getWXContext();
    const audit = {
      ...payload,
      openid: wxContext.OPENID,
      status: 'pending',
      submittedAt: db.serverDate()
    };
    const res = await db.collection('audit_logs').add({ data: audit });
    return ok({ id: res._id });
  }

  return fail(`Unknown action: ${action}`, 'UNKNOWN_ACTION');
};
