const { fetchAdminOrders, updateOrderStatus } = require('../../../utils/order-service');

Page({
  data: {
    keyword: '',
    status: 'all',
    statusLabel: '全部状态',
    statusOptions: [
      { label: '全部状态', value: 'all' },
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    nextStatuses: [
      { label: '待确认', value: 'pending' },
      { label: '已确认', value: 'confirmed' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
      { label: '已取消', value: 'cancelled' }
    ],
    orders: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    fetchAdminOrders().then((allOrders) => {
      const keyword = this.data.keyword.toLowerCase();
      const orders = allOrders.filter((order) => {
        const goodsText = (order.items || []).map((item) => item.productName).join(' ');
        const text = `${order.customerName}${order.customerPhone}${goodsText}`.toLowerCase();
        return (this.data.status === 'all' || order.status === this.data.status) && (!keyword || text.includes(keyword));
      });
      this.setData({ orders });
    }).catch(() => {
      this.setData({ orders: [] });
    });
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, this.refresh);
  },

  onStatus(event) {
    const option = this.data.statusOptions[event.detail.value];
    this.setData({ status: option.value, statusLabel: option.label }, this.refresh);
  },

  changeOrderStatus(event) {
    const id = event.currentTarget.dataset.id;
    const nextStatus = this.data.nextStatuses[event.detail.value].value;
    updateOrderStatus(id, nextStatus).then(() => {
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '状态更新失败',
        icon: 'none'
      });
    });
  }
});
