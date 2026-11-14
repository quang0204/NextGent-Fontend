import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Phone, 
  Mail, 
  AlertCircle,
  CheckCircle,
  X,
  History,
  Eye,
  ShoppingBag,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  ChevronDown
} from 'lucide-react';

import { PortalUser } from '../../types/portal';
import { PortalPagination } from '../../components/portal/PortalPagination';
import { PasswordInput } from '../../components/common/PasswordInput';
import { userService } from '../../services/userService';
import { AdminUserDetail } from '../../types/user';

export const PortalUsersView: React.FC = () => {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'STAFF' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Modal lock/unlock user (API 2.11)
  const [selectedUserForLock, setSelectedUserForLock] = useState<PortalUser | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [lockError, setLockError] = useState('');
  const [isSubmittingLock, setIsSubmittingLock] = useState(false);

  // Modal create staff/admin user (API 2.10)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [createSuccessMsg, setCreateSuccessMsg] = useState('');
  const [createErrorMsg, setCreateErrorMsg] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Modal 360° Profile Detail (API 2.9)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // API 2.8: GET /api/v1/admin/users
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await userService.getAdminUsers({
        page: currentPage,
        limit: pageSize,
        search: searchQuery.trim() || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      const rawItems = res.data?.content || res.data?.items || (Array.isArray(res.data) ? res.data : null);

      if (rawItems && Array.isArray(rawItems)) {
        const mappedUsers: PortalUser[] = rawItems.map((item: any) => ({
          userId: item.userId,
          fullName: item.fullName,
          email: item.email,
          phone: item.phone,
          role: item.role,
          status: item.status,
          lockReason: item.lockReason || undefined,
          totalOrders: item.totalOrders || 0,
          createdAt: item.createdAt ? item.createdAt.split('T')[0] : '2026-03-10',
        }));
        setUsers(mappedUsers);
        setTotalElements(res.data?.totalElements ?? (res.data as any)?.total ?? mappedUsers.length);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API getAdminUsers err, falling back to local list', err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, searchQuery, roleFilter, statusFilter]);

  // Bộ lọc client nếu server trả về danh sách đầy đủ hoặc fallback
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone || '').includes(searchQuery) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    // Nếu số lượng đúng với pageSize thì đã phân trang server
    if (filteredUsers.length <= pageSize) return filteredUsers;
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleOpenLockModal = (user: PortalUser) => {
    setSelectedUserForLock(user);
    setLockReason(user.lockReason || '');
    setLockError('');
  };

  // API 2.11: PATCH /api/v1/admin/users/{userId}/status
  const handleConfirmLockToggle = async () => {
    if (!selectedUserForLock) return;

    setIsSubmittingLock(true);
    if (selectedUserForLock.status === 'ACTIVE') {
      if (!lockReason.trim()) {
        setLockError('Lý do khóa tài khoản không được để trống.');
        setIsSubmittingLock(false);
        return;
      }

      try {
        await userService.updateUserStatus(selectedUserForLock.userId, {
          status: 'LOCKED',
          lockReason: lockReason.trim(),
        });
        loadUsers();
      } catch (err: any) {
        setIsSubmittingLock(false);
        setLockError(err.message || 'Không thể khóa tài khoản này.');
        return;
      }

      setUsers(prev => prev.map(u => {
        if (u.userId === selectedUserForLock.userId) {
          return { ...u, status: 'LOCKED', lockReason: lockReason.trim() };
        }
        return u;
      }));
    } else {
      // Mở khóa
      try {
        await userService.updateUserStatus(selectedUserForLock.userId, {
          status: 'ACTIVE',
        });
        loadUsers();
      } catch (err: any) {
        setIsSubmittingLock(false);
        setLockError(err.message || 'Không thể mở khóa tài khoản này.');
        return;
      }

      setUsers(prev => prev.map(u => {
        if (u.userId === selectedUserForLock.userId) {
          return { ...u, status: 'ACTIVE', lockReason: undefined };
        }
        return u;
      }));
    }

    setIsSubmittingLock(false);
    setSelectedUserForLock(null);
    setLockReason('');
  };

  // API 2.10: POST /api/v1/admin/users/internal
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErrorMsg('');
    if (!newFullName || !newEmail || !newPhone || !newPassword) return;

    if (newPassword.length < 6) {
      setCreateErrorMsg('Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await userService.createInternalUser({
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim(),
        password: newPassword,
        role: newRole,
      });

      if (res.data) {
        setCreateSuccessMsg(`Đã cấp tài khoản ${newRole} cho ${newFullName} thành công!`);
        setShowCreateModal(false);
        setNewFullName('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
        setIsCreatingUser(false);
        loadUsers();
        setTimeout(() => setCreateSuccessMsg(''), 4000);
        return;
      }
    } catch (err: any) {
      setIsCreatingUser(false);
      if (err.statusCode === 409) {
        setCreateErrorMsg(err.message || 'Số điện thoại hoặc Email này đã được đăng ký tài khoản trên hệ thống.');
        return;
      }
      setCreateErrorMsg(err.message || 'Không thể cấp tài khoản nội bộ lúc này.');
      return;
    }

    // Local fallback
    const newUser: PortalUser = {
      userId: Date.now(),
      fullName: newFullName,
      email: newEmail,
      phone: newPhone,
      role: newRole,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().split('T')[0],
      totalOrders: 0
    };

    setUsers(prev => [newUser, ...prev]);
    setShowCreateModal(false);
    setNewFullName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setIsCreatingUser(false);
    setCreateSuccessMsg(`Đã cấp tài khoản ${newRole} cho ${newFullName} thành công!`);
    setTimeout(() => setCreateSuccessMsg(''), 4000);
  };

  // API 2.12: PATCH /api/v1/admin/users/{userId}/role
  const handleChangeRole = async (userId: number, role: 'CUSTOMER' | 'STAFF' | 'ADMIN') => {
    try {
      await userService.updateUserRole(userId, {
        role,
        reason: `Điều chuyển phân quyền tài khoản sang vai trò ${role}`,
      });
      loadUsers();
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role } : u));
    } catch (err: any) {
      alert(err.message || 'Không thể thay đổi quyền hạn của tài khoản này.');
    }
  };

  // API 2.9: GET /api/v1/admin/users/{userId} (360° Profile)
  const handleViewUserDetail = async (userId: number) => {
    setIsLoadingDetail(true);
    setSelectedUserDetail(null);
    setShowDetailModal(true);
    try {
      const res = await userService.getAdminUserDetail(userId);
      if (res.data) {
        setSelectedUserDetail(res.data);
      }
    } catch (err: any) {
      console.warn('API getAdminUserDetail err', err);
      const target = users.find(u => u.userId === userId);
      if (target) {
        setSelectedUserDetail({
          userId: target.userId,
          fullName: target.fullName,
          email: target.email,
          phone: target.phone,
          role: target.role,
          status: target.status,
          lockReason: target.lockReason,
          createdAt: target.createdAt,
          addresses: [],
          shoppingSummary: {
            totalOrders: target.totalOrders || 0,
            completedOrders: target.totalOrders || 0,
            cancelledOrders: 0,
            lifetimeValue: 0,
          },
          recentOrders: [],
          auditLogs: [],
        });
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert toast notification */}
      {createSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{createSuccessMsg}</span>
        </div>
      )}

      {/* Header & Metric Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-blue-600" size={22} />
            Quản trị Người dùng & Phân quyền
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tài khoản Khách hàng, Điều phối viên kho/đơn và Quản trị viên
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition"
        >
          <UserPlus size={16} />
          Cấp tài khoản Nội bộ
        </button>
      </div>

      {/* Role metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng tài khoản</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalElements || users.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tất cả người dùng trên hệ thống</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Quản trị viên</div>
          <div className="text-xl font-bold text-purple-700 mt-1">
            {users.filter(u => u.role === 'ADMIN').length}
          </div>
          <div className="text-[10px] text-purple-500 mt-0.5">Toàn quyền cấu hình & kho</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Nhân viên kho/đơn</div>
          <div className="text-xl font-bold text-blue-700 mt-1">
            {users.filter(u => u.role === 'STAFF').length}
          </div>
          <div className="text-[10px] text-blue-500 mt-0.5">Xử lý đơn hàng, xuất nhập kho</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tài khoản bị khóa</div>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {users.filter(u => u.status === 'LOCKED').length}
          </div>
          <div className="text-[10px] text-rose-500 mt-0.5">Chặn giữ chỗ kho ảo</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Tìm theo họ tên, số điện thoại hoặc email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium transition"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="STAFF">Nhân viên kho/đơn</option>
              <option value="CUSTOMER">Khách hàng</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer font-medium transition"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Bị khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[22%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50/90 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200/80 tracking-wider">
              <tr>
                <th className="py-3 px-3 whitespace-nowrap">Mã & Họ tên</th>
                <th className="py-3 px-3 whitespace-nowrap">Thông tin liên hệ</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Vai trò</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Số đơn mua</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Ngày đăng ký</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-xs font-medium">Đang tải danh sách người dùng từ hệ thống quản trị...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy người dùng phù hợp với tiêu chí lọc
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => (
                  <tr key={u.userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 leading-snug whitespace-nowrap">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">UID: #{u.userId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 text-slate-700 font-mono text-xs whitespace-nowrap">
                        <Phone size={12} className="text-slate-400 flex-shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                        <Mail size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="max-w-[170px] truncate" title={u.email}>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="relative inline-block">
                        <select 
                          value={u.role}
                          onChange={e => handleChangeRole(u.userId, e.target.value as any)}
                          className={`text-[11px] font-bold pl-2.5 pr-6 py-1 rounded-lg border appearance-none cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/80' :
                            u.role === 'STAFF' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/80' :
                            'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Hoạt động
                        </span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            <Lock size={11} />
                            Đã khóa
                          </span>
                          {u.lockReason && (
                            <p className="text-[10px] text-rose-600 mt-0.5 max-w-[130px] truncate text-center" title={u.lockReason}>
                              {u.lockReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                      {u.totalOrders} <span className="text-[11px] text-slate-400 font-normal">đơn</span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {u.createdAt}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewUserDetail(u.userId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                          title="Xem hồ sơ người dùng"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleOpenLockModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                            title="Khóa tài khoản"
                          >
                            <Lock size={12} />
                            <span>Khóa</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenLockModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                            title="Mở khóa tài khoản"
                          >
                            <Unlock size={12} />
                            <span>Mở</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang danh sách người dùng */}
        <PortalPagination
          currentPage={currentPage}
          totalItems={totalElements}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* Modal Lock / Unlock User */}
      {selectedUserForLock && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {selectedUserForLock.status === 'ACTIVE'? (
                  <>
                    <ShieldAlert className="text-rose-600" size={18} />
                    Khóa tài khoản người dùng #{selectedUserForLock.userId}
                  </>
                ): (
                  <>
                    <ShieldCheck className="text-emerald-600" size={18} />
                    Mở khóa tài khoản #{selectedUserForLock.userId}
                  </>
                )}
              </h3>
              <button 
                onClick={() => setSelectedUserForLock(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div><span className="font-semibold">Họ tên:</span> {selectedUserForLock.fullName}</div>
                <div><span className="font-semibold">SĐT:</span> {selectedUserForLock.phone}</div>
                <div><span className="font-semibold">Vai trò:</span> {selectedUserForLock.role}</div>
              </div>

              {selectedUserForLock.status === 'ACTIVE'? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Lý do khóa tài khoản <span className="text-rose-500">*</span>
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Ví dụ: Spam tạo nhiều đơn ảo không thanh toán chiếm dụng giữ chỗ kho..."
                    value={lockReason}
                    onChange={e => {
                      setLockReason(e.target.value);
                      if (e.target.value.trim()) setLockError('');
                    }}
                    className={`w-full p-3 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 ${
                      lockError? 'border-rose-400 bg-rose-50': 'border-slate-300'
                    }`}
                  />
                  {lockError && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1">
                      <AlertCircle size={13} />
                      {lockError}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Lý do khóa tài khoản sẽ được ghi nhận vào Nhật ký kiểm toán hệ thống và hiển thị khi người dùng cố gắng đăng nhập.
                  </p>
                </div>
              ): (
                <div className="space-y-2">
                  <p className="text-xs text-slate-700">
                    Bạn có chắc chắn muốn mở khóa tài khoản cho khách hàng này? Sau khi mở khóa, người dùng có thể đăng nhập và đặt mua hàng bình thường.
                  </p>
                  {selectedUserForLock.lockReason && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <span className="font-semibold">Lý do khóa trước đây:</span> {selectedUserForLock.lockReason}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedUserForLock(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmLockToggle}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition ${
                  selectedUserForLock.status === 'ACTIVE'? 'bg-rose-600 hover:bg-rose-700': 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {selectedUserForLock.status === 'ACTIVE'? 'Xác nhận khóa tài khoản': 'Xác nhận mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Staff/Admin User */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="text-blue-600" size={18} />
                Cấp tài khoản Nội bộ
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên nhân viên <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Hoàng Đức Anh"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    placeholder="0912..."
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email công vụ <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="email"
                    required
                    placeholder="name@nextpick.vn"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                </label>
                <PasswordInput
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu cho tài khoản, tối thiểu 6 ký tự..."
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="!h-10 !py-2 !px-3.5 !border-slate-300 !rounded-xl focus:!ring-1 focus:!ring-blue-500 focus:!border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phân quyền vai trò <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-start gap-2 p-3 border rounded-xl cursor-pointer transition ${
                    newRole === 'STAFF'? 'border-blue-500 bg-blue-50/50 shadow-xs': 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="role"
                      checked={newRole === 'STAFF'}
                      onChange={() => setNewRole('STAFF')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">STAFF</div>
                      <div className="text-[10px] text-slate-500">Xử lý xác nhận đơn, xuất nhập kho </div>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 p-3 border rounded-xl cursor-pointer transition ${
                    newRole === 'ADMIN'? 'border-purple-500 bg-purple-50/50 shadow-xs': 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="role"
                      checked={newRole === 'ADMIN'}
                      onChange={() => setNewRole('ADMIN')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-purple-900">ADMIN</div>
                      <div className="text-[10px] text-slate-500">Toàn quyền hệ thống, phê duyệt giá & phân quyền</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                Mật khẩu khởi tạo dùng để đăng nhập lần đầu vào Portal. Nhân viên có thể đổi lại mật khẩu trong trang cá nhân sau khi đăng nhập.
              </div>

              {createErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{createErrorMsg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Tạo và cấp quyền</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 360° Profile Detail (API 2.9: GET /api/v1/admin/users/{userId}) */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200/80 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={18} />
                <h3 className="font-bold text-sm text-slate-900">
                  Hồ sơ toàn diện 360°
                  {selectedUserDetail && (
                    <span className="font-normal text-slate-600 ml-1.5">
                      #{selectedUserDetail.userId} - {selectedUserDetail.fullName}
                    </span>
                  )}
                </h3>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1">
              {isLoadingDetail ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span>Đang tải thông tin hồ sơ 360°...</span>
                </div>
              ) : selectedUserDetail ? (
                <>
                  {/* Summary Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Vai trò</span>
                      <div className="font-bold text-slate-800 text-sm mt-0.5">{selectedUserDetail.role}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Trạng thái</span>
                      <div className="mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedUserDetail.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {selectedUserDetail.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Tổng đơn hàng</span>
                      <div className="font-bold text-blue-700 text-sm mt-0.5">
                        {selectedUserDetail.shoppingSummary?.totalOrders ?? 0} đơn
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Tổng chi tiêu</span>
                      <div className="font-bold text-emerald-700 text-sm mt-0.5">
                        {((selectedUserDetail.shoppingSummary?.lifetimeValue ?? 0)).toLocaleString('vi-VN')}₫
                      </div>
                    </div>
                  </div>

                  {/* Thông tin liên hệ */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Thông tin liên hệ</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <div><span className="text-slate-400">Email:</span> <strong>{selectedUserDetail.email}</strong></div>
                      <div><span className="text-slate-400">Số điện thoại:</span> <strong>{selectedUserDetail.phone}</strong></div>
                      <div><span className="text-slate-400">Ngày tạo:</span> {selectedUserDetail.createdAt}</div>
                      <div><span className="text-slate-400">Cập nhật:</span> {selectedUserDetail.updatedAt || 'Chưa cập nhật'}</div>
                    </div>
                    {selectedUserDetail.lockReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] mt-2">
                        <span className="font-semibold">Lý do khóa tài khoản:</span> {selectedUserDetail.lockReason}
                      </div>
                    )}
                  </div>

                  {/* Sổ địa chỉ */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <MapPin size={14} className="text-primary" />
                      <span>Sổ địa chỉ: {selectedUserDetail.addresses?.length || 0}</span>
                    </h4>
                    {!selectedUserDetail.addresses || selectedUserDetail.addresses.length === 0 ? (
                      <p className="text-slate-400 italic">Người dùng chưa thêm địa chỉ nhận hàng nào.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedUserDetail.addresses.map((a) => (
                          <div key={a.addressId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900">{a.recipientName} - {a.phone}</span>
                              {a.isDefault && (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Mặc định
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600">{a.addressLine}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Đơn hàng gần đây */}
                  {selectedUserDetail.recentOrders && selectedUserDetail.recentOrders.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-blue-600" />
                        <span>Đơn hàng gần đây</span>
                      </h4>
                      <div className="space-y-1.5">
                        {selectedUserDetail.recentOrders.map((ord) => (
                          <div key={ord.orderId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <div className="font-mono font-bold text-slate-800">{ord.orderCode}</div>
                              <div className="text-[10px] text-slate-400">{ord.createdAt}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{(ord.totalAmount).toLocaleString('vi-VN')}₫</div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">
                                {ord.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nhật ký kiểm toán */}
                  {selectedUserDetail.auditLogs && selectedUserDetail.auditLogs.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <History size={14} className="text-purple-600" />
                        <span>Nhật ký kiểm toán liên quan</span>
                      </h4>
                      <div className="space-y-1.5">
                        {selectedUserDetail.auditLogs.map((log) => (
                          <div key={log.logId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                            <div className="flex items-center justify-between font-medium">
                              <span className="font-mono font-bold text-purple-700">{log.action}</span>
                              <span className="text-slate-400 text-[10px]">{log.createdAt}</span>
                            </div>
                            <div className="text-slate-600 mt-0.5">{log.newValue}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
