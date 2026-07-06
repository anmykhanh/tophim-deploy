'use client';

import React, { useState, useEffect } from 'react';

const PERMISSIONS_LIST = [
  { key: 'manage_movies', label: 'Quản lý Phim' },
  { key: 'manage_episodes', label: 'Quản lý Tập phim' },
  { key: 'manage_categories', label: 'Quản lý Danh mục' },
  { key: 'manage_nominations', label: 'Quản lý Đề cử' },
  { key: 'manage_requests', label: 'Yêu cầu phim' },
  { key: 'manage_crawler', label: 'Trình thu thập' },
  { key: 'manage_error_reports', label: 'Báo cáo lỗi phim' },
  { key: 'manage_articles', label: 'Quản lý Bài viết' },
  { key: 'manage_article_comments', label: 'Bình luận Bài viết' },
  { key: 'manage_comments', label: 'Quản lý Bình luận (Phim)' },
  { key: 'manage_users', label: 'Quản lý Thành viên & Vai trò' },
  { key: 'manage_labels', label: 'Quản lý Nhãn Thành viên' },
  { key: 'manage_notifications', label: 'Quản lý Thông báo' },
  { key: 'manage_sendmail', label: 'Gửi Email' },
  { key: 'manage_contacts', label: 'Quản lý Liên hệ' },
  { key: 'manage_ads', label: 'Quản lý Quảng cáo' },
  { key: 'manage_settings', label: 'Cài đặt Hệ thống' }
];

export default function AdminRolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [formId, setFormId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (role: any = null) => {
    if (role) {
      setFormId(role.id);
      setFormName(role.name);
      setFormDesc(role.description || '');
      setFormPerms(Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]'));
    } else {
      setFormId(null);
      setFormName('');
      setFormDesc('');
      setFormPerms([]);
    }
    setShowModal(true);
  };

  const togglePermission = (permKey: string) => {
    setFormPerms(prev => 
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert('Vui lòng nhập tên vai trò');

    try {
      const method = formId ? 'PUT' : 'POST';
      const body = { id: formId, name: formName, description: formDesc, permissions: formPerms };
      const res = await fetch('/api/admin/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        alert(formId ? 'Cập nhật thành công' : 'Thêm mới thành công');
        setShowModal(false);
        loadRoles();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vai trò này? Các thành viên mang vai trò này sẽ bị thu hồi quyền.')) return;
    try {
      const res = await fetch(`/api/admin/roles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Xóa thành công');
        loadRoles();
      } else {
        const data = await res.json();
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối');
    }
  };

  if (isLoading) return <div className="text-center p-10">Đang tải...</div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Quản Lý Phân Quyền (Roles)</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Thêm Vai Trò
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-xs">
            <tr>
              <th className="px-6 py-4">ID</th>
              <th className="px-6 py-4">Tên Vai Trò</th>
              <th className="px-6 py-4">Mô tả</th>
              <th className="px-6 py-4">Quyền hạn</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roles.map(role => {
              const perms = Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]');
              return (
                <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">#{role.id}</td>
                  <td className="px-6 py-4 font-semibold text-blue-600">{role.name}</td>
                  <td className="px-6 py-4">{role.description}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {perms.length === 0 ? <span className="text-slate-400">Không có quyền</span> : null}
                      {perms.map((p: string) => (
                        <span key={p} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded font-semibold">
                          {PERMISSIONS_LIST.find(x => x.key === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenModal(role)}
                      className="text-blue-500 hover:text-blue-700 font-bold mr-4"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">{formId ? 'Sửa Vai Trò' : 'Thêm Vai Trò Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tên Vai Trò</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                    placeholder="VD: Biên tập viên"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Mô tả (tùy chọn)</label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    placeholder="VD: Quản lý bài viết và bình luận"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-bold text-slate-700 mb-3">Chọn Quyền Hạn (Permissions)</label>
                  <div className="space-y-3">
                    {PERMISSIONS_LIST.map(perm => (
                      <label key={perm.key} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formPerms.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-1 w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{perm.label}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">{perm.key}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md shadow-blue-500/20"
                >
                  {formId ? 'Lưu Thay Đổi' : 'Tạo Vai Trò'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
