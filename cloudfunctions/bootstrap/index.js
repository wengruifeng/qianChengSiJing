const cloud = require('wx-server-sdk');
const { getSeedData } = require('./seed');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COLLECTIONS = [
  'users',
  'admins',
  'products',
  'categories',
  'orders',
  'order_items',
  'addresses',
  'audit_logs',
  'home_contents',
  'message_settings',
  'operation_logs'
];

async function ensureCollections() {
  const results = [];
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      results.push({ name, created: true });
    } catch (error) {
      results.push({ name, created: false, message: error.message });
    }
  }
  return results;
}

async function seedCollection(name, rows) {
  const countResult = await db.collection(name).where({
    _id: _.exists(true)
  }).count();

  if (countResult.total > 0) {
    return {
      name,
      skipped: true,
      inserted: 0,
      reason: 'collection-not-empty',
      existingCount: countResult.total
    };
  }

  if (!rows.length) {
    return {
      name,
      skipped: true,
      inserted: 0,
      reason: 'no-seed-rows'
    };
  }

  let inserted = 0;
  for (const row of rows) {
    await db.collection(name).add({ data: row });
    inserted += 1;
  }

  return {
    name,
    skipped: false,
    inserted
  };
}

async function seedDemoData() {
  const seedMap = getSeedData();
  const results = [];
  for (const name of COLLECTIONS) {
    const rows = seedMap[name] || [];
    const result = await seedCollection(name, rows);
    results.push(result);
  }
  return results;
}

exports.main = async (event = {}) => {
  const { seedDemo = false } = event;
  const collections = await ensureCollections();
  const result = {
    ok: true,
    collections
  };

  if (seedDemo) {
    result.seed = await seedDemoData();
  }

  return result;
};
