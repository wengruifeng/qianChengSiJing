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

function cloudFirst(action, payload = {}, fallback) {
  if (runtime.mode === RUNTIME_MODE.CLOUD_FIRST && canUseCloud()) {
    return callCloud(action, payload).then((res) => {
      if (res.ok) return res.data;
      if (runtime.fallbackToMock && typeof fallback === 'function') return fallback();
      throw new Error(res.message || `${action} failed`);
    }).catch((error) => {
      if (runtime.fallbackToMock && typeof fallback === 'function') return fallback();
      throw error;
    });
  }

  if (runtime.fallbackToMock && typeof fallback === 'function') {
    return Promise.resolve(fallback());
  }

  return Promise.reject(new Error('当前云服务不可用，请确认云开发环境和云函数已部署'));
}

module.exports = {
  cloudFirst,
  callCloud,
  canUseCloud,
  initCloud
};
