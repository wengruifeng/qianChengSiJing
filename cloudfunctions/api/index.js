const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const DEV_PHONE_LOGIN_ENABLED = true;

const BOOTSTRAP_ADMIN_MAP = {
  '13800000000': { id: 'bootstrap_super_admin', phone: '13800000000', role: 'super_admin', status: 'enabled', deleteStatus: 'normal', protected: true, name: '特殊超级管理员' },
  '13900000000': { id: 'bootstrap_admin', phone: '13900000000', role: 'admin', status: 'enabled', deleteStatus: 'normal', protected: false, name: '管理员' }
};

function ok(data = {}) {
  return { ok: true, data };
}

function fail(message, code = 'UNKNOWN_ERROR') {
  return { ok: false, code, message };
}

async function findAdminByPhone(phone) {
  try {
    const res = await db.collection('admins').where({ phone, status: 'enabled' }).limit(1).get();
    if (res.data[0] && res.data[0].deleteStatus !== 'deleted') return res.data[0];
  } catch (error) {
    // 初始化阶段 admins 集合可能还不存在，允许走引导期白名单。
  }
  return BOOTSTRAP_ADMIN_MAP[phone] || null;
}

async function findUserByPhone(phone) {
  const res = await db.collection('users').where({ phone }).limit(1).get();
  return res.data[0] || null;
}

async function findUserById(id) {
  const res = await db.collection('users').where({ id }).limit(1).get();
  return res.data[0] || null;
}

async function findUserByOpenId(openid) {
  if (!openid) return null;
  const res = await db.collection('users').where({ openid }).limit(1).get();
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

async function fetchPagedCollection(buildQuery, { page = 1, pageSize = 20, orderBy, orderDirection = 'desc' } = {}) {
  const safePage = Math.max(1, Number(page || 1));
  const safePageSize = Math.min(50, Math.max(10, Number(pageSize || 20)));
  let query = buildQuery();
  if (orderBy) {
    query = query.orderBy(orderBy, orderDirection);
  }
  const [res, countRes] = await Promise.all([
    query.skip((safePage - 1) * safePageSize).limit(safePageSize).get(),
    buildQuery().count()
  ]);
  return {
    items: res.data,
    page: safePage,
    pageSize: safePageSize,
    total: countRes.total,
    hasMore: (safePage - 1) * safePageSize + res.data.length < countRes.total
  };
}

async function fetchAllCollection(buildQuery, { pageSize = 100, orderBy, orderDirection = 'desc' } = {}) {
  const safePageSize = Math.min(100, Math.max(20, Number(pageSize || 100)));
  let page = 1;
  let hasMore = true;
  const items = [];
  while (hasMore) {
    let query = buildQuery();
    if (orderBy) {
      query = query.orderBy(orderBy, orderDirection);
    }
    const res = await query.skip((page - 1) * safePageSize).limit(safePageSize).get();
    items.push(...res.data);
    hasMore = res.data.length === safePageSize;
    page += 1;
  }
  return items;
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function sanitizePayload(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const next = {};
  Object.keys(value).forEach((key) => {
    if (key === '_id' || key === '_openid') return;
    next[key] = sanitizePayload(value[key]);
  });
  return next;
}

async function getCurrentCloudUser() {
  const wxContext = cloud.getWXContext();
  return findUserByOpenId(wxContext.OPENID);
}

async function requireCurrentCloudUser() {
  const user = await getCurrentCloudUser();
  if (!user) throw new Error('CURRENT_USER_NOT_FOUND');
  return user;
}

function isAdminRole(role) {
  return role === 'admin' || role === 'super_admin';
}

async function requireAdminCloudUser() {
  const user = await requireCurrentCloudUser();
  if (!isAdminRole(user.role)) throw new Error('ADMIN_PERMISSION_DENIED');
  return user;
}

async function requireSuperAdminCloudUser() {
  const user = await requireCurrentCloudUser();
  if (user.role !== 'super_admin') throw new Error('SUPER_ADMIN_PERMISSION_DENIED');
  return user;
}

async function requireProtectedSuperAdminCloudUser() {
  const user = await requireSuperAdminCloudUser();
  const admin = await findAdminByPhone(user.phone);
  if (!admin || admin.protected !== true) throw new Error('ROOT_ADMIN_PERMISSION_DENIED');
  return {
    user,
    admin
  };
}

function mapPermissionError(error) {
  if (!error || !error.message) return null;
  const mapping = {
    CURRENT_USER_NOT_FOUND: fail('未找到当前登录用户', 'CURRENT_USER_NOT_FOUND'),
    ADMIN_PERMISSION_DENIED: fail('仅管理员可操作', 'ADMIN_PERMISSION_DENIED'),
    SUPER_ADMIN_PERMISSION_DENIED: fail('仅超级管理员可操作', 'SUPER_ADMIN_PERMISSION_DENIED'),
    ROOT_ADMIN_PERMISSION_DENIED: fail('仅特殊超级管理员可操作', 'ROOT_ADMIN_PERMISSION_DENIED'),
    ORDER_PERMISSION_DENIED: fail('无权查看该订单', 'ORDER_PERMISSION_DENIED'),
    ADDRESS_PERMISSION_DENIED: fail('无权查看该地址', 'ADDRESS_PERMISSION_DENIED')
  };
  return mapping[error.message] || null;
}

async function upsertUserByVerifiedPhone({ phone, wxContext, authSource = 'manual_dev' }) {
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
      adminProtected: adminRecord ? adminRecord.protected === true : false,
      customerStatus: 'not_applied',
      company: '',
      region: '',
      addressDetail: '',
      remark: '',
      phoneAuthAt: nowText(),
      phoneAuthSource: authSource,
      lastLoginAt: nowText(),
      createdAt: nowText(),
      updatedAt: nowText()
    };
    await db.collection('users').add({ data: user });
  } else {
    const patch = {
      openid: wxContext.OPENID || user.openid || '',
      phoneAuthAt: nowText(),
      phoneAuthSource: authSource,
      lastLoginAt: nowText(),
      updatedAt: nowText()
    };
    if (adminRecord && user.role !== adminRecord.role) {
      patch.role = adminRecord.role;
    }
    if (adminRecord) {
      patch.adminProtected = adminRecord.protected === true;
    } else if (isAdminRole(user.role)) {
      patch.role = 'customer';
      patch.adminProtected = false;
    }
    await db.collection('users').doc(user._id).update({ data: patch });
    user = {
      ...user,
      ...patch
    };
  }

  return {
    user,
    adminRecord
  };
}

async function getWechatPhoneNumberByCode(phoneCode) {
  if (!phoneCode) {
    return fail('缺少微信手机号授权凭据', 'PHONE_CODE_REQUIRED');
  }

  if (!cloud.openapi || !cloud.openapi.phonenumber || !cloud.openapi.phonenumber.getPhoneNumber) {
    return fail('当前云函数未启用微信手机号能力，请重新上传部署 api 云函数后重试', 'WECHAT_PHONE_API_UNAVAILABLE');
  }

  try {
    const res = await cloud.openapi.phonenumber.getPhoneNumber({ code: phoneCode });
    const phoneInfo = res.phone_info || res.phoneInfo || {};
    const phone = phoneInfo.purePhoneNumber || phoneInfo.phoneNumber || res.purePhoneNumber || res.phoneNumber || '';

    if (!phone) {
      return fail('未获取到微信手机号，请重试', 'WECHAT_PHONE_EMPTY');
    }

    return ok({
      phone,
      countryCode: phoneInfo.countryCode || res.countryCode || '86'
    });
  } catch (error) {
    return fail(`微信手机号授权失败：${error.message || '请在真机调试中重试'}`, 'WECHAT_PHONE_FETCH_FAILED');
  }
}

async function loginByPhone(payload) {
  const { phone } = payload;
  if (!phone) {
    return fail('手机号不能为空', 'PHONE_REQUIRED');
  }
  if (!DEV_PHONE_LOGIN_ENABLED) {
    return fail('当前环境已关闭手填手机号登录，请使用微信手机号授权登录', 'DEV_PHONE_LOGIN_DISABLED');
  }

  const wxContext = cloud.getWXContext();
  const { user, adminRecord } = await upsertUserByVerifiedPhone({
    phone,
    wxContext,
    authSource: 'manual_dev'
  });

  return ok({
    user,
    adminRecord
  });
}

async function loginByWxPhone(payload) {
  const { phoneCode } = payload;
  const wxContext = cloud.getWXContext();
  const phoneRes = await getWechatPhoneNumberByCode(phoneCode);
  if (!phoneRes.ok) return phoneRes;

  const { phone } = phoneRes.data;
  const { user, adminRecord } = await upsertUserByVerifiedPhone({
    phone,
    wxContext,
    authSource: 'wechat_phone'
  });

  return ok({
    user,
    adminRecord,
    verifiedPhone: maskPhone(phone)
  });
}

async function getCurrentUser(payload) {
  const { userId, phone } = payload;
  const wxContext = cloud.getWXContext();
  let user = await findUserByOpenId(wxContext.OPENID);

  if (!user && userId) user = await findUserById(userId);
  if (!user && phone) user = await findUserByPhone(phone);

  if (!user) {
    return fail('未找到当前用户', 'USER_NOT_FOUND');
  }

  const patch = {};
  if (wxContext.OPENID && user.openid !== wxContext.OPENID) {
    patch.openid = wxContext.OPENID;
  }

  const adminRecord = await findAdminByPhone(user.phone);
  if (adminRecord && user.role !== adminRecord.role) {
    patch.role = adminRecord.role;
  }
  if (adminRecord) {
    patch.adminProtected = adminRecord.protected === true;
  } else if (isAdminRole(user.role)) {
    patch.role = 'customer';
    patch.adminProtected = false;
  }

  if (Object.keys(patch).length) {
    patch.updatedAt = nowText();
    await db.collection('users').doc(user._id).update({
      data: patch
    });
    user = {
      ...user,
      ...patch
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
  return ok(res.data.filter((item) => item.deleteStatus !== 'deleted'));
}

async function listCategoriesForAdmin() {
  await requireAdminCloudUser();
  const res = await db.collection('categories')
    .orderBy('sort', 'asc')
    .limit(100)
    .get();
  return ok(res.data.filter((item) => item.deleteStatus !== 'deleted'));
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
  await requireAdminCloudUser();
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

async function listCartItems(payload) {
  const user = await requireCurrentCloudUser();
  const cartRes = await db.collection('carts').where({ userId: user.id }).get();
  const cartItems = cartRes.data;
  const result = [];
  for (const item of cartItems) {
    const productRes = await db.collection('products').where({ id: item.productId }).limit(1).get();
    const product = productRes.data[0] || null;
    if (product) result.push({ ...item, product });
  }
  return ok(result);
}

async function addToCart(payload) {
  const { productId, quantity = 1 } = payload;
  if (!productId) return fail('缺少商品 ID', 'PRODUCT_ID_REQUIRED');
  const user = await requireCurrentCloudUser();
  const productRes = await db.collection('products').where({ id: productId, deleteStatus: 'normal', saleStatus: 'on' }).limit(1).get();
  const product = productRes.data[0] || null;
  if (!product) return fail('商品不存在', 'PRODUCT_NOT_FOUND');

  const cartRes = await db.collection('carts').where({ userId: user.id, productId }).limit(1).get();
  const existing = cartRes.data[0] || null;
  const nextQuantity = Number(quantity) || 0;
  const currentQuantity = existing ? Number(existing.quantity || 0) : 0;
  const availableStock = Math.max(0, Number(product.stock || 0) - Number(product.lockedStock || 0));
  if (availableStock <= 0) return fail('商品已售罄', 'PRODUCT_SOLD_OUT');
  if (currentQuantity + nextQuantity > availableStock) return fail('库存不足', 'INSUFFICIENT_STOCK');

  if (existing) {
    await db.collection('carts').doc(existing._id).update({
      data: {
        quantity: currentQuantity + nextQuantity,
        checked: true
      }
    });
  } else {
    await db.collection('carts').add({
      data: {
        id: nextId('cart'),
        userId: user.id,
        productId,
        quantity: nextQuantity,
        checked: true
      }
    });
  }
  return ok({ ok: true });
}

async function updateCartQuantity(payload) {
  const { cartId, quantity } = payload;
  if (!cartId) return fail('缺少购物车 ID', 'CART_ID_REQUIRED');
  const user = await requireCurrentCloudUser();
  const cartRes = await db.collection('carts').where({ id: cartId, userId: user.id }).limit(1).get();
  const cartItem = cartRes.data[0] || null;
  if (!cartItem) return fail('购物车项不存在', 'CART_ITEM_NOT_FOUND');
  const nextQuantity = Number(quantity);
  if (!Number.isFinite(nextQuantity) || nextQuantity < 0) return fail('数量不合法', 'INVALID_QUANTITY');
  if (nextQuantity === 0) {
    await db.collection('carts').doc(cartItem._id).remove();
    return ok({ ok: true, removed: true });
  }
  const productRes = await db.collection('products').where({ id: cartItem.productId }).limit(1).get();
  const product = productRes.data[0] || null;
  if (!product) return fail('商品不存在', 'PRODUCT_NOT_FOUND');
  const availableStock = Math.max(0, Number(product.stock || 0) - Number(product.lockedStock || 0));
  if (nextQuantity > availableStock) {
    return fail('库存不足', 'INSUFFICIENT_STOCK');
  }
  await db.collection('carts').doc(cartItem._id).update({
    data: {
      quantity: nextQuantity
    }
  });
  return ok({ ok: true, quantity: nextQuantity });
}

async function submitApply(payload) {
  const { company, region, addressDetail } = payload;
  if (!company || !region || !addressDetail) {
    return fail('请填写完整资料', 'APPLY_FIELDS_REQUIRED');
  }
  let user = await requireCurrentCloudUser();
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
  const user = await requireCurrentCloudUser();
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
  const currentUser = await requireCurrentCloudUser();
  const { userId } = payload;
  if (userId && userId !== currentUser.id) {
    throw new Error('ADDRESS_PERMISSION_DENIED');
  }
  const res = await db.collection('addresses').where({ userId: currentUser.id }).get();
  return ok(res.data);
}

async function listCustomers(payload = {}) {
  await requireAdminCloudUser();
  const pagedUsers = await fetchPagedCollection(
    () => db.collection('users').where({ role: 'customer' }),
    {
      page: payload.page || 1,
      pageSize: payload.pageSize || 20,
      orderBy: 'updatedAt',
      orderDirection: 'desc'
    }
  );
  const users = pagedUsers.items;
  const customers = await Promise.all(users.map(async (item) => {
    const [customerOrders, customerAddresses] = await Promise.all([
      fetchAllCollection(() => db.collection('orders').where({ userId: item.id }), {
        pageSize: 100,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      }),
      fetchAllCollection(() => db.collection('addresses').where({ userId: item.id }), {
        pageSize: 100,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      })
    ]);
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
      addressCount: customerAddresses.length
    };
  }));
  return ok({
    items: customers,
    page: pagedUsers.page,
    pageSize: pagedUsers.pageSize,
    total: pagedUsers.total,
    hasMore: pagedUsers.hasMore
  });
}

async function listAdmins(payload = {}) {
  await requireProtectedSuperAdminCloudUser();
  const role = payload.role === 'super_admin' ? 'super_admin' : 'admin';
  const res = await db.collection('admins')
    .where({ status: 'enabled', role })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  return ok(res.data.filter((item) => item.deleteStatus !== 'deleted'));
}

async function addAdmin(payload) {
  const { phone, role = 'admin', name = '', remark = '' } = payload;
  if (!/^1\d{10}$/.test(phone || '')) {
    return fail('请输入正确手机号', 'INVALID_PHONE');
  }
  const { user: operator } = await requireProtectedSuperAdminCloudUser();
  const safeRole = role === 'super_admin' ? 'super_admin' : 'admin';
  const existingRes = await db.collection('admins').where({ phone }).limit(1).get();
  const existing = existingRes.data[0] || null;
  const now = nowText();

  if (existing) {
    if (existing.deleteStatus !== 'deleted' && existing.role !== safeRole) {
      return fail('该手机号已是其他后台角色，请先删除后再重新添加', 'ADMIN_ROLE_CONFLICT');
    }
    await db.collection('admins').doc(existing._id).update({
      data: {
        role: safeRole,
        status: 'enabled',
        deleteStatus: 'normal',
        name,
        remark,
        updatedAt: now,
        updatedBy: operator.id
      }
    });
  } else {
    await db.collection('admins').add({
      data: {
        id: nextId('admin'),
        phone,
        role: safeRole,
        status: 'enabled',
        deleteStatus: 'normal',
        protected: false,
        name,
        remark,
        createdAt: now,
        createdBy: operator.id,
        updatedAt: now
      }
    });
  }

  const user = await findUserByPhone(phone);
  if (user && user.role !== safeRole) {
    await db.collection('users').doc(user._id).update({
      data: {
        role: safeRole,
        updatedAt: now
      }
    });
  }

  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: operator.id,
      operatorName: operator.nickName,
      type: 'admin_add',
      target: phone,
      summary: `添加${safeRole === 'super_admin' ? '超级管理员' : '管理员'} ${maskPhone(phone)}`,
      createdAt: now
    }
  });

  return ok({ phone, role: safeRole, status: 'enabled', deleteStatus: 'normal', name, remark });
}

async function updateAdmin(payload) {
  const { id, role = 'admin', phone, name = '', remark = '' } = payload;
  if (!id) return fail('缺少管理员 ID', 'ADMIN_ID_REQUIRED');
  if (!/^1\d{10}$/.test(phone || '')) return fail('请输入正确手机号', 'INVALID_PHONE');
  const { user: operator } = await requireProtectedSuperAdminCloudUser();
  const safeRole = role === 'super_admin' ? 'super_admin' : 'admin';
  const adminRes = await db.collection('admins').where({ id, role: safeRole }).limit(1).get();
  const admin = adminRes.data[0] || null;
  if (!admin || admin.deleteStatus === 'deleted') return fail('管理员不存在', 'ADMIN_NOT_FOUND');
  if (admin.protected === true && admin.phone !== phone) {
    return fail('特殊超级管理员不能修改手机号', 'ADMIN_PROTECTED_PHONE_LOCKED');
  }

  const duplicateRes = await db.collection('admins').where({ phone }).limit(10).get();
  const duplicate = duplicateRes.data.find((item) => item.id !== id && item.deleteStatus !== 'deleted');
  if (duplicate) return fail('该手机号已是后台账号', 'ADMIN_PHONE_DUPLICATED');

  const now = nowText();
  await db.collection('admins').doc(admin._id).update({
    data: {
      phone,
      name,
      remark,
      updatedAt: now,
      updatedBy: operator.id
    }
  });

  const oldUser = await findUserByPhone(admin.phone);
  if (oldUser && admin.phone !== phone) {
    await db.collection('users').doc(oldUser._id).update({
      data: {
        role: 'customer',
        updatedAt: now
      }
    });
  }
  const user = await findUserByPhone(phone);
  if (user && user.role !== safeRole) {
    await db.collection('users').doc(user._id).update({
      data: {
        role: safeRole,
        updatedAt: now
      }
    });
  }

  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: operator.id,
      operatorName: operator.nickName,
      type: 'admin_update',
      target: phone,
      summary: `修改${safeRole === 'super_admin' ? '超级管理员' : '管理员'} ${maskPhone(phone)}`,
      createdAt: now
    }
  });

  return ok({ id, phone, role: safeRole, name, remark });
}

async function deleteAdmin(payload) {
  const { id, role = 'admin' } = payload;
  if (!id) return fail('缺少管理员 ID', 'ADMIN_ID_REQUIRED');
  const { user: operator } = await requireProtectedSuperAdminCloudUser();
  const safeRole = role === 'super_admin' ? 'super_admin' : 'admin';
  const adminRes = await db.collection('admins').where({ id, role: safeRole }).limit(1).get();
  const admin = adminRes.data[0] || null;
  if (!admin || admin.deleteStatus === 'deleted') return fail('管理员不存在', 'ADMIN_NOT_FOUND');
  if (admin.phone === operator.phone) return fail('不能删除自己', 'ADMIN_DELETE_SELF_DENIED');
  if (admin.protected === true) return fail('特殊超级管理员不能删除', 'ADMIN_DELETE_PROTECTED_DENIED');

  const now = nowText();
  await db.collection('admins').doc(admin._id).update({
    data: {
      deleteStatus: 'deleted',
      updatedAt: now,
      updatedBy: operator.id
    }
  });

  const user = await findUserByPhone(admin.phone);
  if (user && user.role === safeRole) {
    await db.collection('users').doc(user._id).update({
      data: {
        role: 'customer',
        updatedAt: now
      }
    });
  }

  await db.collection('operation_logs').add({
    data: {
      id: nextId('op'),
      operatorId: operator.id,
      operatorName: operator.nickName,
      type: 'admin_delete',
      target: admin.phone,
      summary: `删除${safeRole === 'super_admin' ? '超级管理员' : '管理员'} ${maskPhone(admin.phone)}`,
      createdAt: now
    }
  });

  return ok({ id, deleted: true });
}

async function createCategoryAudit(payload) {
  const user = await requireAdminCloudUser();
  const { type, targetId, beforeData, afterData, summary } = payload;
  if (!type) return fail('缺少分类变更类型', 'CATEGORY_AUDIT_TYPE_REQUIRED');

  if (type === 'category_delete') {
    const productCount = await db.collection('products')
      .where({ categoryId: targetId, deleteStatus: 'normal' })
      .count();
    if (productCount.total > 0) {
      return fail('该分类下还有商品，不能删除', 'CATEGORY_HAS_PRODUCTS');
    }
  }

  const audit = {
    id: nextId('audit'),
    type,
    targetCollection: 'categories',
    targetId: targetId || '',
    submitterId: user.id,
    submitterName: user.nickName,
    submittedAt: nowText(),
    status: 'pending',
    reviewerId: '',
    reviewerName: '',
    reviewedAt: '',
    beforeData: beforeData ? sanitizePayload(beforeData) : null,
    afterData: afterData ? sanitizePayload(afterData) : null,
    summary: summary || '',
    rejectReason: ''
  };
  await db.collection('audit_logs').add({ data: audit });
  return ok(audit);
}

async function reviewCustomer(payload) {
  const { id, status } = payload;
  if (!id || !status) return fail('缺少客户审核参数', 'REVIEW_PARAMS_REQUIRED');
  const reviewer = await requireAdminCloudUser();
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
  await requireAdminCloudUser();
  const userRes = await db.collection('users').where({ id }).limit(1).get();
  const customer = userRes.data[0] || null;
  if (!customer) return fail('未找到客户', 'CUSTOMER_NOT_FOUND');
  const logsPage = Math.max(1, Number(payload.logsPage || 1));
  const logsPageSize = Math.min(50, Math.max(10, Number(payload.logsPageSize || 20)));
  const [orders, addresses, operatorLogs, targetLogs] = await Promise.all([
    fetchAllCollection(() => db.collection('orders').where({ userId: id }), {
      pageSize: 100,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }),
    fetchAllCollection(() => db.collection('addresses').where({ userId: id }), {
      pageSize: 100,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }),
    fetchAllCollection(() => db.collection('operation_logs').where({ operatorId: id }), {
      pageSize: 100,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }),
    fetchAllCollection(() => db.collection('operation_logs').where({ target: customer.phone }), {
      pageSize: 100,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    })
  ]);
  const logMap = new Map();
  operatorLogs.concat(targetLogs).forEach((item) => {
    if (!logMap.has(item.id)) {
      logMap.set(item.id, item);
    }
  });
  const allLogs = Array.from(logMap.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const logs = allLogs.slice((logsPage - 1) * logsPageSize, logsPage * logsPageSize);
  return ok({
    customer,
    orderCount: orders.length,
    orderAmount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2),
    latestOrders: orders.slice(0, 5),
    addresses,
    logs,
    logsPage,
    logsPageSize,
    logsTotal: allLogs.length,
    logsHasMore: logsPage * logsPageSize < allLogs.length
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

  const user = await requireCurrentCloudUser();

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
  const orderNo = `QCSJZL${Date.now()}`;
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

  const cartIds = items.map((item) => item.cartId).filter(Boolean);
  if (cartIds.length) {
    const cartRes = await db.collection('carts').where({ userId: user.id }).get();
    for (const cartItem of cartRes.data) {
      if (cartIds.includes(cartItem.id)) {
        await db.collection('carts').doc(cartItem._id).remove();
      }
    }
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
  const currentUser = await requireCurrentCloudUser();
  const { userId } = payload;
  if (userId && userId !== currentUser.id) {
    throw new Error('ORDER_PERMISSION_DENIED');
  }
  const status = payload.status && payload.status !== 'all' ? payload.status : '';
  const pagedOrders = await fetchPagedCollection(
    () => {
      const query = { userId: currentUser.id };
      if (status) query.status = status;
      return db.collection('orders').where(query);
    },
    {
      page: payload.page || 1,
      pageSize: payload.pageSize || 20,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }
  );
  const items = await listOrderItemsByOrderIds(pagedOrders.items.map((item) => item.id));
  return ok({
    items: attachItemsToOrders(pagedOrders.items, items),
    page: pagedOrders.page,
    pageSize: pagedOrders.pageSize,
    total: pagedOrders.total,
    hasMore: pagedOrders.hasMore
  });
}

async function getOrderDetail(payload) {
  const { id } = payload;
  if (!id) return fail('缺少订单 ID', 'ORDER_ID_REQUIRED');
  const currentUser = await requireCurrentCloudUser();
  const res = await db.collection('orders').where({ id }).limit(1).get();
  const order = res.data[0] || null;
  if (!order) return fail('订单不存在', 'ORDER_NOT_FOUND');
  if (!isAdminRole(currentUser.role) && order.userId !== currentUser.id) {
    throw new Error('ORDER_PERMISSION_DENIED');
  }
  const itemRes = await db.collection('order_items').where({ orderId: id }).get();
  return ok({
    ...order,
    items: itemRes.data
  });
}

async function confirmReceive(payload) {
  const { id } = payload;
  if (!id) return fail('缺少订单 ID', 'ORDER_ID_REQUIRED');
  const currentUser = await requireCurrentCloudUser();
  const res = await db.collection('orders').where({ id }).limit(1).get();
  const order = res.data[0] || null;
  if (!order) return fail('订单不存在', 'ORDER_NOT_FOUND');
  if (order.userId !== currentUser.id) {
    throw new Error('ORDER_PERMISSION_DENIED');
  }
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

async function listAdminOrders(payload = {}) {
  await requireAdminCloudUser();
  const status = payload.status && payload.status !== 'all' ? payload.status : '';
  const pagedOrders = await fetchPagedCollection(
    () => {
      const query = status ? { status } : {};
      return query.status ? db.collection('orders').where(query) : db.collection('orders');
    },
    {
      page: payload.page || 1,
      pageSize: payload.pageSize || 20,
      orderBy: 'createdAt',
      orderDirection: 'desc'
    }
  );
  const items = await listOrderItemsByOrderIds(pagedOrders.items.map((item) => item.id));
  return ok({
    items: attachItemsToOrders(pagedOrders.items, items),
    page: pagedOrders.page,
    pageSize: pagedOrders.pageSize,
    total: pagedOrders.total,
    hasMore: pagedOrders.hasMore
  });
}

async function updateOrderStatus(payload) {
  const { id, nextStatus } = payload;
  if (!id || !nextStatus) return fail('缺少订单状态参数', 'ORDER_STATUS_PARAMS_REQUIRED');
  const operator = await requireAdminCloudUser();
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
      operatorId: operator.id,
      operatorName: operator.nickName,
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

  try {
    if (action === 'ping') {
      return ok({ time: Date.now() });
    }

    if (action === 'authLoginByPhone') {
      return loginByPhone(payload);
    }

    if (action === 'authLoginByWxPhone') {
      return loginByWxPhone(payload);
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

    if (action === 'listCategoriesForAdmin') {
      return listCategoriesForAdmin(payload);
    }

    if (action === 'getProduct') {
      return getProduct(payload);
    }

    if (action === 'getHomeContent') {
      return getHomeContent(payload);
    }

    if (action === 'listCartItems') {
      return listCartItems(payload);
    }

    if (action === 'addToCart') {
      return addToCart(payload);
    }

    if (action === 'updateCartQuantity') {
      return updateCartQuantity(payload);
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

    if (action === 'listAdmins') {
      return listAdmins(payload);
    }

    if (action === 'addAdmin') {
      return addAdmin(payload);
    }

    if (action === 'updateAdmin') {
      return updateAdmin(payload);
    }

    if (action === 'deleteAdmin') {
      return deleteAdmin(payload);
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
      const user = await requireAdminCloudUser();
      const audit = {
        id: nextId('audit'),
        type: payload.type,
        targetCollection: payload.targetCollection,
        targetId: payload.targetId,
        submitterId: user.id,
        submitterName: user.nickName,
        submittedAt: nowText(),
        status: 'pending',
        reviewerId: '',
        reviewerName: '',
        reviewedAt: '',
        beforeData: payload.beforeData ? sanitizePayload(payload.beforeData) : null,
        afterData: payload.afterData ? sanitizePayload(payload.afterData) : null,
        summary: payload.summary || '',
        rejectReason: ''
      };
      await db.collection('audit_logs').add({ data: audit });
      return ok(audit);
    }

    if (action === 'createCategoryAudit') {
      return createCategoryAudit(payload);
    }

    if (action === 'listAudits') {
      await requireAdminCloudUser();
      const allowedStatuses = ['pending', 'approved', 'rejected'];
      const status = allowedStatuses.includes(payload.status) ? payload.status : 'all';
      const page = Math.max(1, Number(payload.page || 1));
      const pageSize = Math.min(50, Math.max(10, Number(payload.pageSize || 20)));
      const offset = (page - 1) * pageSize;
      const buildQuery = () => {
        const collection = db.collection('audit_logs');
        return status === 'all' ? collection : collection.where({ status });
      };
      const [res, countRes] = await Promise.all([
        buildQuery()
        .orderBy('submittedAt', 'desc')
          .skip(offset)
          .limit(pageSize)
          .get(),
        buildQuery().count()
      ]);
      return ok({
        items: res.data,
        page,
        pageSize,
        total: countRes.total,
        hasMore: offset + res.data.length < countRes.total
      });
    }

    if (action === 'reviewAudit') {
      const { id, action: reviewAction, rejectReason } = payload;
      if (!id || !reviewAction) return fail('缺少审核参数', 'AUDIT_PARAMS_REQUIRED');
      const reviewer = await requireSuperAdminCloudUser();
      const auditRes = await db.collection('audit_logs').where({ id }).limit(1).get();
      const audit = auditRes.data[0] || null;
      if (!audit) return fail('审核记录不存在', 'AUDIT_NOT_FOUND');
      if (audit.status !== 'pending') return fail('该审核已处理', 'AUDIT_ALREADY_REVIEWED');

      if (reviewAction === 'approve') {
        if (audit.targetCollection === 'products') {
          if (audit.type === 'product_create') {
            const productData = {
              id: nextId('p'),
              ...sanitizePayload(audit.afterData || {}),
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
                  ...sanitizePayload(audit.afterData || {}),
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
                ...sanitizePayload(audit.afterData || {}),
                updatedAt: nowText(),
                updatedBy: reviewer.id
              }
            });
          }
        }
        if (audit.targetCollection === 'categories') {
          if (audit.type === 'category_create') {
            const categoryData = {
              id: nextId('cat'),
              status: 'enabled',
              deleteStatus: 'normal',
              ...sanitizePayload(audit.afterData || {}),
              createdAt: nowText(),
              updatedAt: nowText(),
              updatedBy: reviewer.id
            };
            await db.collection('categories').add({ data: categoryData });
          } else {
            const categoryRes = await db.collection('categories').where({ id: audit.targetId }).limit(1).get();
            const category = categoryRes.data[0] || null;
            if (category) {
              if (audit.type === 'category_delete') {
                const productCount = await db.collection('products')
                  .where({ categoryId: audit.targetId, deleteStatus: 'normal' })
                  .count();
                if (productCount.total > 0) {
                  return fail('该分类下还有商品，不能删除', 'CATEGORY_HAS_PRODUCTS');
                }
              }
              const patch = audit.type === 'category_delete'
                ? {
                    deleteStatus: 'deleted',
                    updatedAt: nowText(),
                    updatedBy: reviewer.id
                  }
                : {
                    ...sanitizePayload(audit.afterData || {}),
                    updatedAt: nowText(),
                    updatedBy: reviewer.id
                  };
              await db.collection('categories').doc(category._id).update({ data: patch });
            }
          }
          await db.collection('operation_logs').add({
            data: {
              id: nextId('op'),
              operatorId: reviewer.id,
              operatorName: reviewer.nickName,
              type: 'category_audit_approve',
              target: audit.targetId || (audit.afterData && audit.afterData.name) || '',
              summary: `通过${audit.summary || '分类变更'}`,
              createdAt: nowText()
            }
          });
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
      await requireAdminCloudUser();
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
  } catch (error) {
    const permissionResult = mapPermissionError(error);
    if (permissionResult) return permissionResult;
    throw error;
  }
};

