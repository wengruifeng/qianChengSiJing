const { fetchOrderDetail, confirmReceive } = require('../../utils/order-service');

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
    fetchOrderDetail(this.data.id).then((order) => {
      const totalQty = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
      this.setData({
        order,
        statusText: order ? this.data.statusMap[order.status] : '',
        statusClass: order ? `status-${order.status}` : '',
        remarkText: order && order.remark ? order.remark : '无',
        totalQty,
        goodsCount: order ? order.items.length : 0
      });
    }).catch(() => {
      this.setData({
        order: null,
        statusText: '',
        statusClass: '',
        remarkText: '无',
        totalQty: 0,
        goodsCount: 0
      });
    });
  },

  confirmReceive() {
    confirmReceive(this.data.id).then(() => {
      wx.showToast({ title: '已确认收货' });
      this.refresh();
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '操作失败，请稍后再试',
        icon: 'none'
      });
    });
  }
});
