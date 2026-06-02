const { seedStore } = require('./utils/store');

App({
  globalData: {
    env: 'mock-first',
    cloudReady: false
  },

  onLaunch() {
    seedStore();
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
      this.globalData.cloudReady = true;
    }
  }
});
