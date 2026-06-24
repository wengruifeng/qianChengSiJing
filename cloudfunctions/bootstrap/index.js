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
  'carts',
  'addresses',
  'audit_logs',
  'home_contents',
  'message_settings',
  'operation_logs'
];

const RESET_COLLECTIONS = [
  'products',
  'categories',
  'orders',
  'order_items',
  'carts',
  'addresses',
  'audit_logs',
  'home_contents',
  'message_settings',
  'operation_logs'
];

async function sanitizeBundledImagePaths() {
  const tasks = [];

  tasks.push(
    db.collection('products').where({
      _id: _.exists(true)
    }).update({
      data: {
        mainImage: '',
        detailImages: []
      }
    }).then((res) => ({
      name: 'products',
      updated: Number((res.stats && res.stats.updated) || 0)
    })).catch(() => ({
      name: 'products',
      updated: 0
    }))
  );

  tasks.push(
    db.collection('home_contents').where({
      _id: _.exists(true)
    }).update({
      data: {
        heroImage: '',
        topicImage: '',
        logoImage: ''
      }
    }).then((res) => ({
      name: 'home_contents',
      updated: Number((res.stats && res.stats.updated) || 0)
    })).catch(() => ({
      name: 'home_contents',
      updated: 0
    }))
  );

  tasks.push(
    db.collection('order_items').where({
      _id: _.exists(true)
    }).update({
      data: {
        mainImage: ''
      }
    }).then((res) => ({
      name: 'order_items',
      updated: Number((res.stats && res.stats.updated) || 0)
    })).catch(() => ({
      name: 'order_items',
      updated: 0
    }))
  );

  return Promise.all(tasks);
}

async function clearCollection(name) {
  let removed = 0;

  while (true) {
    const res = await db.collection(name).where({
      _id: _.exists(true)
    }).remove();
    const currentRemoved = Number((res.stats && res.stats.removed) || 0);
    removed += currentRemoved;
    if (!currentRemoved) break;
  }

  return {
    name,
    removed
  };
}

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

async function seedDemoData(options = {}) {
  const seedMap = getSeedData(options);
  const results = [];
  for (const name of COLLECTIONS) {
    const rows = seedMap[name] || [];
    const result = await seedCollection(name, rows);
    results.push(result);
  }
  return results;
}

exports.main = async (event = {}) => {
  const { seedDemo = false, seedDemoWithBundledImages = false, resetDemo = false, sanitizeBundledImages = false } = event;
  const collections = await ensureCollections();
  const result = {
    ok: true,
    collections
  };

  if (resetDemo) {
    result.reset = [];
    for (const name of RESET_COLLECTIONS) {
      result.reset.push(await clearCollection(name));
    }
  }

  if (seedDemo) {
    result.seed = await seedDemoData({
      includeBundledImages: !!seedDemoWithBundledImages
    });
  }

  if (sanitizeBundledImages) {
    result.sanitized = await sanitizeBundledImagePaths();
  }

  return result;
};
