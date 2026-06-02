const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const collections = [
    'users',
    'admins',
    'products',
    'categories',
    'orders',
    'addresses',
    'audit_logs',
    'home_contents',
    'message_settings',
    'operation_logs'
  ];

  const results = [];
  for (const name of collections) {
    try {
      await db.createCollection(name);
      results.push({ name, created: true });
    } catch (error) {
      results.push({ name, created: false, message: error.message });
    }
  }

  return { ok: true, collections: results };
};
