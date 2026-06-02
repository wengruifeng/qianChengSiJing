const { requireLogin, getCurrentUser } = require('../../utils/auth');
const { getStore } = require('../../utils/store');

Page({
  data: {
    tabs: [
      { label: '全部', value: 'all' },
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    statusMap: {
      pending: '待确认',
      confirmed: '已确认',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消'
    },
    active: 'all',
    orders: [],
    filteredOrders: []
  },

  onShow() {
    if (!requireLogin('/pages/orders/orders')) return;
    const user = getCurrentUser();
    const orders = getStore().orders
      .filter((item) => item.userId === user.id)
      .map((item) => ({
        ...item,
        statusText: this.data.statusMap[item.status],
        statusClass: `status-${item.status}`,
        totalQty: item.items.reduce((sum, goods) => sum + goods.quantity, 0),
        firstGoodsText: item.items.map((goods) => goods.productName).join('、'),
        remarkText: item.remark || '无备注'
      }));
    this.setData({ orders }, this.filter);
  },

  changeTab(event) {
    this.setData({ active: event.currentTarget.dataset.value }, this.filter);
  },

  filter() {
    this.setData({
      filteredOrders: this.data.active === 'all' ? this.data.orders : this.data.orders.filter((item) => item.status === this.data.active)
    });
  },

  openOrder(event) {
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${event.currentTarget.dataset.id}` });
  }
});
