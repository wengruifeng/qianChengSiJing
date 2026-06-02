const { requireLogin } = require('../../utils/auth');
const { fetchUserOrders } = require('../../utils/order-service');

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
    fetchUserOrders().then((orders) => {
      this.setData({ orders }, this.filter);
    }).catch(() => {
      this.setData({ orders: [], filteredOrders: [] });
    });
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
