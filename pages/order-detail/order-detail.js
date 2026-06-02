const { getStore, updateStore, nowText } = require('../../utils/store');

Page({
  data: {
    id: '',
    order: null,
    statusMap: {
      pending: '待确认',
      confirmed: '已确认',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消'
    }
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.refresh();
  },

  refresh() {
    const order = getStore().orders.find((item) => item.id === this.data.id);
    const totalQty = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
    this.setData({
      order,
      statusText: order ? this.data.statusMap[order.status] : '',
      statusClass: order ? `status-${order.status}` : '',
      remarkText: order && order.remark ? order.remark : '无',
      totalQty,
      goodsCount: order ? order.items.length : 0
    });
  },

  confirmReceive() {
    updateStore((store) => {
      const order = store.orders.find((item) => item.id === this.data.id);
      if (order) {
        order.status = 'completed';
        order.completedAt = nowText();
      }
    });
    wx.showToast({ title: '已确认收货' });
    this.refresh();
  }
});
