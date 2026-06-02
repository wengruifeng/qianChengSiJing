const { getStore, updateStore, nextId, nowText } = require('./store');
const { callCloud, canUseCloud } = require('./cloud');
const { runtime } = require('./config');

const CURRENT_USER_ID_KEY = 'zht_current_user_id';
const CURRENT_USER_PHONE_KEY = 'zht_current_user_phone';
const CURRENT_USER_CACHE_KEY = 'zht_current_user_cache';

function normalizeUser(user) {
  if (!user) return null;
  const normalized = { ...user };
  delete normalized._id;
  return normalized;
}

function cacheCurrentUser(user) {
  if (!user) return;
  wx.setStorageSync(CURRENT_USER_ID_KEY, user.id);
  wx.setStorageSync(CURRENT_USER_PHONE_KEY, user.phone || '');
  wx.setStorageSync(CURRENT_USER_CACHE_KEY, user);
}

function clearCurrentUserCache() {
  wx.removeStorageSync(CURRENT_USER_ID_KEY);
  wx.removeStorageSync(CURRENT_USER_PHONE_KEY);
  wx.removeStorageSync(CURRENT_USER_CACHE_KEY);
}

function syncUserToMockStore(user) {
  if (!user) return;
  updateStore((store) => {
    const index = store.users.findIndex((item) => item.id === user.id || item.phone === user.phone);
    if (index >= 0) {
      store.users[index] = {
        ...store.users[index],
        ...user
      };
    } else {
      store.users.push({ ...user });
    }
  });
}

function getCachedCurrentUser() {
  const cached = wx.getStorageSync(CURRENT_USER_CACHE_KEY);
  if (cached && cached.id) return cached;

  const userId = wx.getStorageSync(CURRENT_USER_ID_KEY);
  if (!userId) return null;
  const store = getStore();
  return store.users.find((item) => item.id === userId) || null;
}

function getCurrentUser() {
  return getCachedCurrentUser();
}

function isApprovedCustomer(user) {
  return !!(user && user.customerStatus === 'approved');
}

function canSeePrice() {
  return isApprovedCustomer(getCurrentUser());
}

function isAdmin(user) {
  return !!(user && (user.role === 'admin' || user.role === 'super_admin'));
}

function isSuperAdmin(user) {
  return !!(user && user.role === 'super_admin');
}

function loginByPhoneMock(phone) {
  let current;
  updateStore((store) => {
    current = store.users.find((item) => item.phone === phone);
    const adminRecord = store.admins.find((item) => item.phone === phone && item.status === 'enabled');
    if (!current) {
      current = {
        id: nextId('user'),
        openid: '',
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
      store.users.push(current);
    }
    if (adminRecord) current.role = adminRecord.role;
    current.updatedAt = nowText();
  });
  current = normalizeUser(current);
  cacheCurrentUser(current);
  syncUserToMockStore(current);
  return Promise.resolve(current);
}

function shouldUseCloudAuth() {
  return runtime.mode === 'cloud-first' && canUseCloud();
}

function loginByPhone(phone) {
  if (!shouldUseCloudAuth()) {
    return loginByPhoneMock(phone);
  }

  return callCloud('authLoginByPhone', { phone }).then((res) => {
    if (!res.ok) {
      if (runtime.fallbackToMock) return loginByPhoneMock(phone);
      throw new Error(res.message || '云端登录失败');
    }
    const user = normalizeUser(res.data.user);
    cacheCurrentUser(user);
    syncUserToMockStore(user);
    return user;
  }).catch((error) => {
    if (runtime.fallbackToMock) return loginByPhoneMock(phone);
    throw error;
  });
}

function refreshCurrentUser() {
  const userId = wx.getStorageSync(CURRENT_USER_ID_KEY);
  const phone = wx.getStorageSync(CURRENT_USER_PHONE_KEY);
  if (!userId && !phone) return Promise.resolve(null);

  if (!shouldUseCloudAuth()) {
    return Promise.resolve(getCurrentUser());
  }

  return callCloud('authGetCurrentUser', { userId, phone }).then((res) => {
    if (!res.ok) {
      if (runtime.fallbackToMock) return getCurrentUser();
      clearCurrentUserCache();
      return null;
    }
    const user = normalizeUser(res.data.user);
    cacheCurrentUser(user);
    syncUserToMockStore(user);
    return user;
  }).catch(() => {
    if (runtime.fallbackToMock) return getCurrentUser();
    return null;
  });
}

function requireLogin(redirect) {
  const user = getCurrentUser();
  if (user) return user;
  wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(redirect || '')}` });
  return null;
}

module.exports = {
  canSeePrice,
  clearCurrentUserCache,
  getCurrentUser,
  isAdmin,
  isApprovedCustomer,
  isSuperAdmin,
  loginByPhone,
  refreshCurrentUser,
  requireLogin
};
