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
    const res = await db.collection('products').where({ deleteStatus: 'normal', saleStatus: 'on' }).limit(100).get();
    return ok(res.data);
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
