const { getStore, updateStore, nextId, nowText } = require('./store');

function getCurrentUser() {
  const userId = wx.getStorageSync('zht_current_user_id');
  if (!userId) return null;
  const store = getStore();
  return store.users.find((item) => item.id === userId) || null;
}

function isApprovedCustomer(user) {
  return user && user.customerStatus === 'approved';
}

function canSeePrice() {
  return isApprovedCustomer(getCurrentUser());
}

function isAdmin(user) {
  return user && (user.role === 'admin' || user.role === 'super_admin');
}

function isSuperAdmin(user) {
  return user && user.role === 'super_admin';
}

function loginByPhone(phone) {
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
        createdAt: nowText()
      };
      store.users.push(current);
    }
    if (adminRecord) current.role = adminRecord.role;
  });
  wx.setStorageSync('zht_current_user_id', current.id);
  return current;
}

function requireLogin(redirect) {
  const user = getCurrentUser();
  if (user) return user;
  wx.navigateTo({ url: `/pages/login/login?redirect=${encodeURIComponent(redirect || '')}` });
  return null;
}

module.exports = {
  canSeePrice,
  getCurrentUser,
  isAdmin,
  isApprovedCustomer,
  isSuperAdmin,
  loginByPhone,
  requireLogin
};
