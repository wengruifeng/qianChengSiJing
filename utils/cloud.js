const { runtime, RUNTIME_MODE } = require('./config');

function canUseCloud() {
  return runtime.mode !== RUNTIME_MODE.MOCK_ONLY && !!wx.cloud;
}

function initCloud() {
  if (!canUseCloud()) {
    return { ready: false, reason: 'cloud-disabled' };
  }

  try {
    wx.cloud.init({
      env: runtime.cloudEnvId,
      traceUser: true
    });
    return { ready: true, envId: runtime.cloudEnvId };
  } catch (error) {
    return { ready: false, reason: error.message || 'cloud-init-failed' };
  }
}

function callCloud(action, payload = {}, options = {}) {
  if (!canUseCloud()) {
    return Promise.resolve({
      ok: false,
      code: 'CLOUD_DISABLED',
      message: 'Cloud runtime is disabled in current mode.'
    });
  }

  return wx.cloud.callFunction({
    name: options.functionName || 'api',
    data: {
      action,
      payload
    }
  }).then((res) => res.result || { ok: false, message: 'Empty cloud result' });
}

module.exports = {
  callCloud,
  canUseCloud,
  initCloud
};
