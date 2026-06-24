const { cloudFirst } = require('./cloud');
const { runtime } = require('./config');
const { getStore, updateStore, nextId, nowText } = require('./store');
const { getCurrentUser } = require('./auth');

const statusMap = {
  not_applied: '未申请',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
};

function updateCachedUser(user) {
  if (!user) return;
  wx.setStorageSync('zht_current_user_cache', user);
  wx.setStorageSync('zht_current_user_id', user.id);
  wx.setStorageSync('zht_current_user_phone', user.phone || '');
  if (!runtime.localMockEnabled) return;
  updateStore((store) => {
    const index = store.users.findIndex((item) => item.id === user.id || item.phone === user.phone);
    if (index >= 0) {
      store.users[index] = { ...store.users[index], ...user };
    } else {
      store.users.push({ ...user });
    }
  });
}

function submitApplyMock({ company, region, addressDetail }) {
  const currentUser = getCurrentUser();
  if (!currentUser) throw new Error('请先登录');
  let latestUser = null;
  updateStore((store) => {
    const user = store.users.find((item) => item.id === currentUser.id);
    user.company = company;
    user.region = region;
    user.addressDetail = addressDetail;
    user.customerStatus = 'pending';
    user.appliedAt = nowText();
    latestUser = { ...user };
    store.operationLogs.unshift({
      id: nextId('op'),
      operatorId: user.id,
      operatorName: user.nickName,
      type: 'apply_price',
      target: user.phone,
      summary: `${user.company} 提交查看价格申请`,
      createdAt: nowText()
    });
  });
  updateCachedUser(latestUser);
  return { user: latestUser };
}

function submitApply(payload) {
  return cloudFirst('submitApply', payload, () => submitApplyMock(payload)).then((data) => {
    if (data.user) updateCachedUser(data.user);
    return data;
  });
}

function saveAddressMock(form) {
  const user = getCurrentUser();
  if (!user) throw new Error('请先登录');
  let saved = null;
  updateStore((store) => {
    const hasDefault = store.addresses.some((item) => item.userId === user.id && item.isDefault);
    saved = { id: nextId('addr'), userId: user.id, ...form, isDefault: !hasDefault, createdAt: nowText(), updatedAt: nowText() };
    store.addresses.push(saved);
  });
  return saved;
}

function saveAddress(form) {
  return cloudFirst('saveAddress', { form }, () => saveAddressMock(form));
}

function fetchAddressesByCurrentUser() {
  const user = getCurrentUser();
  if (!user) return Promise.resolve([]);
  return cloudFirst('listAddresses', { userId: user.id }, () => {
    return getStore().addresses.filter((item) => item.userId === user.id);
  });
}

function fetchCustomers() {
  return fetchAllPagedCustomers(() => {
    const store = getStore();
    return store.users
      .filter((item) => item.role === 'customer' || item.customerStatus)
      .map((item) => {
        const customerOrders = store.orders.filter((order) => order.userId === item.id);
        const addressCount = store.addresses.filter((address) => address.userId === item.id).length;
        return {
          ...item,
          displayName: item.company || item.nickName,
          statusText: statusMap[item.customerStatus] || '未申请',
          statusClass: `status-${item.customerStatus || 'not_applied'}`,
          orderCount: customerOrders.length,
          totalAmount: customerOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2),
          addressCount
        };
      });
  });
}

function reviewCustomerMock({ id, status }) {
  const reviewer = getCurrentUser();
  updateStore((store) => {
    const user = store.users.find((item) => item.id === id);
    user.customerStatus = status;
    user.reviewedAt = nowText();
    user.reviewerName = reviewer.nickName;
    store.operationLogs.unshift({
      id: nextId('op'),
      operatorId: reviewer.id,
      operatorName: reviewer.nickName,
      type: 'customer_review',
      target: user.phone,
      summary: `${status === 'approved' ? '通过' : '拒绝'}客户看价申请`,
      createdAt: nowText()
    });
  });
  return { ok: true };
}

function reviewCustomer(payload) {
  return cloudFirst('reviewCustomer', payload, () => reviewCustomerMock(payload));
}

function fetchCustomerDetail(id) {
  return cloudFirst('getCustomerDetail', { id, logsPage: 1, logsPageSize: 20 }, () => {
    const store = getStore();
    const customer = store.users.find((item) => item.id === id);
    const orders = store.orders.filter((item) => item.userId === id);
    const addresses = store.addresses.filter((item) => item.userId === id);
    const logs = store.operationLogs.filter((item) => item.operatorId === id || item.target === customer.phone).slice(0, 20);
    return {
      customer,
      orderCount: orders.length,
      orderAmount: orders.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2),
      latestOrders: orders.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5),
      addresses,
      logs,
      logsPage: 1,
      logsPageSize: 20,
      logsTotal: logs.length,
      logsHasMore: false
    };
  });
}

function fetchCustomerLogsPage(id, logsPage = 1, logsPageSize = 20) {
  return cloudFirst('getCustomerDetail', { id, logsPage, logsPageSize }, () => {
    const store = getStore();
    const customer = store.users.find((item) => item.id === id);
    const logs = store.operationLogs
      .filter((item) => item.operatorId === id || (customer && item.target === customer.phone))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const start = (logsPage - 1) * logsPageSize;
    return {
      logs: logs.slice(start, start + logsPageSize),
      logsPage,
      logsPageSize,
      logsTotal: logs.length,
      logsHasMore: start + logsPageSize < logs.length
    };
  }).then((data) => ({
    logs: data.logs || [],
    logsPage: data.logsPage || logsPage,
    logsPageSize: data.logsPageSize || logsPageSize,
    logsTotal: typeof data.logsTotal === 'number' ? data.logsTotal : (data.logs || []).length,
    logsHasMore: !!data.logsHasMore
  }));
}

module.exports = {
  fetchAddressesByCurrentUser,
  fetchCustomerDetail,
  fetchCustomerLogsPage,
  fetchCustomers,
  reviewCustomer,
  saveAddress,
  statusMap,
  submitApply
};

function normalizeCustomerPageResult(result) {
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

function fetchAllPagedCustomers(fallback) {
  const pageSize = 50;
  return cloudFirst('listCustomers', { page: 1, pageSize }, fallback).then((firstResult) => {
    const normalizedFirst = normalizeCustomerPageResult(firstResult);
    if (!normalizedFirst.hasMore) {
      return normalizedFirst.items;
    }
    const tasks = [];
    for (let page = 2; page <= Math.ceil(normalizedFirst.total / pageSize); page += 1) {
      tasks.push(cloudFirst('listCustomers', { page, pageSize }, fallback).then(normalizeCustomerPageResult));
    }
    return Promise.all(tasks).then((results) => normalizedFirst.items.concat(results.flatMap((result) => result.items)));
  });
}
