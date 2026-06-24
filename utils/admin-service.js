const { callCloud } = require('./cloud');

function normalizeAdmin(item) {
  if (!item) return null;
  const admin = { ...item };
  delete admin._id;
  delete admin._openid;
  return admin;
}

function fetchAdmins(role = 'admin') {
  return callCloud('listAdmins', { role }).then((res) => {
    if (!res.ok) throw new Error(res.message || '管理员列表加载失败');
    return (res.data || []).map(normalizeAdmin);
  });
}

function addAdmin({ phone, role = 'admin', name = '', remark = '' }) {
  return callCloud('addAdmin', { phone, role, name, remark }).then((res) => {
    if (!res.ok) throw new Error(res.message || '添加管理员失败');
    return res.data;
  });
}

function updateAdmin({ id, phone, role = 'admin', name = '', remark = '' }) {
  return callCloud('updateAdmin', { id, phone, role, name, remark }).then((res) => {
    if (!res.ok) throw new Error(res.message || '修改管理员失败');
    return res.data;
  });
}

function deleteAdmin({ id, role = 'admin' }) {
  return callCloud('deleteAdmin', { id, role }).then((res) => {
    if (!res.ok) throw new Error(res.message || '删除管理员失败');
    return res.data;
  });
}

module.exports = {
  addAdmin,
  deleteAdmin,
  updateAdmin,
  fetchAdmins
};
