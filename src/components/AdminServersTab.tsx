'use client';

import React, { useState, useEffect } from 'react';

export default function AdminServersTab() {
  const [servers, setServers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<any>(null);

  const loadServers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      display_name: formData.get('display_name'),
      priority: formData.get('priority')
    };

    const method = currentServer ? 'PUT' : 'POST';
    if (currentServer) {
      (data as any).id = currentServer.id;
    }

    try {
      const res = await fetch('/api/admin/servers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        alert(resData.message);
        setIsModalOpen(false);
        loadServers();
      } else {
        alert(resData.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa máy chủ này?')) return;
    try {
      const res = await fetch(`/api/admin/servers?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        loadServers();
      } else {
        alert(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Quản lý máy chủ (Global Server Priority)</h2>
        <button
          onClick={() => {
            setCurrentServer(null);
            setIsModalOpen(true);
          }}
          className="bg-[#00ac47] text-white px-4 py-2 rounded font-medium hover:bg-[#00ac47]/90 transition-colors"
        >
          Thêm máy chủ mới
        </button>
      </div>
      <div className="text-sm text-zinc-400">
        Điểm ưu tiên càng cao thì server càng được ưu tiên hiển thị và chọn phát mặc định. Nếu điểm ưu tiên bằng nhau, hệ thống sẽ sắp xếp theo Tên theo bảng chữ cái.
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-white">Đang tải...</div>
      ) : (
        <div className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="p-4 font-medium">Tên Server (Name)</th>
                  <th className="p-4 font-medium">Tên Hiển Thị</th>
                  <th className="p-4 font-medium">Điểm Ưu Tiên</th>
                  <th className="p-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {servers.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 text-white">{s.name}</td>
                    <td className="p-4 text-white">{s.display_name}</td>
                    <td className="p-4 text-white">{s.priority}</td>
                    <td className="p-4 text-right space-x-3">
                      <button
                        onClick={() => {
                          setCurrentServer(s);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {servers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500">
                      Chưa có máy chủ nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {currentServer ? 'Sửa máy chủ' : 'Thêm máy chủ mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tên Server (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={currentServer?.name || ''}
                  required
                  placeholder="VD: VIP 1"
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]"
                />
                <p className="text-xs text-zinc-500 mt-1">Dùng để ghép (match) chính xác với server phát (VD: VIP 1, Vietsub).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tên Hiển Thị (Display Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="display_name"
                  defaultValue={currentServer?.display_name || ''}
                  required
                  placeholder="VD: Server Siêu Tốc"
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Điểm Ưu Tiên (Priority)
                </label>
                <input
                  type="number"
                  name="priority"
                  defaultValue={currentServer?.priority ?? 0}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-[#00ac47]"
                />
                <p className="text-xs text-zinc-500 mt-1">Số càng lớn thì mức độ ưu tiên càng cao.</p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#00ac47] hover:bg-[#00ac47]/90 rounded-lg transition-colors"
                >
                  {currentServer ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
