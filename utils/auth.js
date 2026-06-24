const { getStore, updateStore, nextId, nowText } = require('./store');
const { callCloud, canUseCloud } = require('./cloud');
const { runtime } = require('./config');

const CURRENT_USER_ID_KEY = 'zht_current_user_id';
const CURRENT_USER_PHONE_KEY = 'zht_current_user_phone';
const CURRENT_USER_CACHE_KEY = 'zht_current_user_cache';
const LOGIN_CANCELLED_AT_KEY = 'zht_login_cancelled_at';
let lastLoginRedirectSkipped = false;

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

function markLoginCancelled() {
  wx.setStorageSync(LOGIN_CANCELLED_AT_KEY, Date.now());
}

function shouldSkipLoginRedirectOnce() {
  const cancelledAt = Number(wx.getStorageSync(LOGIN_CANCELLED_AT_KEY) || 0);
  lastLoginRedirectSkipped = false;
  if (!cancelledAt) return false;
  wx.removeStorageSync(LOGIN_CANCELLED_AT_KEY);
  lastLoginRedirectSkipped = Date.now() - cancelledAt < 2000;
  return lastLoginRedirectSkipped;
}

function wasLoginRedirectSkipped() {
  return lastLoginRedirectSkipped;
}

function leaveRestrictedPageAfterLoginCancel() {
  if (!wasLoginRedirectSkipped()) return false;
  wx.switchTab({ url: '/pages/index/index' });
  return true;
}

function syncUserToMockStore(user) {
  if (!runtime.localMockEnabled) return;
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

  if (!runtime.localMockEnabled) return null;
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
  const user = getCurrentUser();
  return isApprovedCustomer(user) || isAdmin(user);
}

function isAdmin(user) {
  return !!(user && (user.role === 'admin' || user.role === 'super_admin'));
}

function isSuperAdmin(user) {
  return !!(user && user.role === 'super_admin');
}

function isRootAdmin(user) {
  return !!(user && user.role === 'super_admin' && user.adminProtected === true);
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
    if (runtime.fallbackToMock || runtime.localMockEnabled) return loginByPhoneMock(phone);
    return Promise.reject(new Error('当前云端登录不可用，请确认云函数已部署'));
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

function loginByWxPhoneCode(phoneCode) {
  if (!phoneCode) {
    return Promise.reject(new Error('微信手机号授权失败，请重试'));
  }

  if (!shouldUseCloudAuth()) {
    return Promise.reject(new Error('当前环境未启用云端登录'));
  }

  return callCloud('authLoginByWxPhone', { phoneCode }).then((res) => {
    if (!res.ok) {
      throw new Error(res.message || '微信手机号授权登录失败');
    }
    const user = normalizeUser(res.data.user);
    cacheCurrentUser(user);
    syncUserToMockStore(user);
    return user;
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
  if (shouldSkipLoginRedirectOnce()) return null;
  wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(redirect || '')}` });
  return null;
}

function goLoginOrApply() {
  const user = getCurrentUser();
  if (user) {
    wx.navigateTo({ url: '/pages/apply/apply' });
    return;
  }
  wx.navigateTo({
    url: `/pages/login/login?redirect=${encodeURIComponent('/pages/apply/apply')}`
  });
}

module.exports = {
  canSeePrice,
  clearCurrentUserCache,
  goLoginOrApply,
  getCurrentUser,
  isAdmin,
  isApprovedCustomer,
  isRootAdmin,
  isSuperAdmin,
  leaveRestrictedPageAfterLoginCancel,
  loginByPhone,
  loginByWxPhoneCode,
  markLoginCancelled,
  refreshCurrentUser,
  requireLogin,
  wasLoginRedirectSkipped
};
