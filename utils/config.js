const APP_NAME = '前呈似景供应链';
const APP_ID = 'wx3079736104fac8e3';
const CLOUD_ENV_ID = 'a01-d4ggnjhhqfabf9ba2';

const RUNTIME_MODE = {
  MOCK_ONLY: 'mock-only',
  CLOUD_FIRST: 'cloud-first'
};

const runtime = {
  appName: APP_NAME,
  appId: APP_ID,
  cloudEnvId: CLOUD_ENV_ID,
  mode: RUNTIME_MODE.CLOUD_FIRST,
  fallbackToMock: true
};

module.exports = {
  APP_ID,
  APP_NAME,
  CLOUD_ENV_ID,
  RUNTIME_MODE,
  runtime
};
