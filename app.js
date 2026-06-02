const { seedStore } = require('./utils/store');
const { runtime } = require('./utils/config');
const { initCloud } = require('./utils/cloud');
const { refreshCurrentUser } = require('./utils/auth');

App({
  globalData: {
    appName: runtime.appName,
    appId: runtime.appId,
    env: runtime.mode,
    cloudEnvId: runtime.cloudEnvId,
    cloudReady: false,
    cloudFallbackToMock: runtime.fallbackToMock
  },

  onLaunch() {
    seedStore();
    const cloudState = initCloud();
    this.globalData.cloudReady = cloudState.ready;
    this.globalData.cloudState = cloudState;
    refreshCurrentUser().then((user) => {
      this.globalData.currentUser = user || null;
    });
  }
});
