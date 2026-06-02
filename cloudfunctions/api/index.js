const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function ok(data = {}) {
  return { ok: true, data };
}

function fail(message) {
  return { ok: false, message };
}

exports.main = async (event) => {
  const { action, payload = {} } = event;

  if (action === 'ping') {
    return ok({ time: Date.now() });
  }

  if (action === 'listProducts') {
    const res = await db.collection('products').where({ deleteStatus: 'normal', saleStatus: 'on' }).limit(100).get();
    return ok(res.data);
  }

  if (action === 'createAudit') {
    const wxContext = cloud.getWXContext();
    const audit = {
      ...payload,
      openid: wxContext.OPENID,
      status: 'pending',
      submittedAt: db.serverDate()
    };
    const res = await db.collection('audit_logs').add({ data: audit });
    return ok({ id: res._id });
  }

  return fail(`Unknown action: ${action}`);
};
