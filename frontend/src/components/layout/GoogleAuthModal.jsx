import React, { useState } from 'react';
import { auth, googleProvider } from '../../services/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function GoogleAuthModal({ onGuestLogin }) {
  const [loading, setLoading] = useState(false);
  const [guestUid, setGuestUid] = useState('');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSubmit = (e) => {
    e.preventDefault();
    if (!guestUid.trim()) {
      setError('Vui lòng nhập mã UID nông trại cần xem!');
      return;
    }
    onGuestLogin(guestUid.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-outline-variant/30 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-container/20 text-primary flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-3xl">eco</span>
        </div>
        <h2 className="text-2xl font-bold text-primary">AgroLogic Smart Farm</h2>
        <p className="text-sm text-on-surface-variant mt-1 mb-6">
          Hệ thống nông nghiệp sinh thái & quản lý vi khí hậu thông minh
        </p>

        {error && (
          <div className="p-3 mb-4 text-xs bg-error-container text-error rounded-lg font-medium text-left">
            ⚠️ {error}
          </div>
        )}

        {/* NÚT ĐĂNG NHẬP GOOGLE CHO CHỦ VƯỜN */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl border border-outline-variant hover:bg-surface-variant/50 transition-all font-semibold text-sm flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-5 h-5" />
          <span>{loading ? 'Đang xác thực...' : 'Đăng nhập với Google (Chủ vườn)'}</span>
        </button>

        {/* ĐƯỜNG KẺ PHÂN TÁCH */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-outline-variant/50"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-outline font-medium">Hoặc</span>
          </div>
        </div>

        {/* Ô NHẬP MÃ UID DÀNH CHO KHÁCH XEM NÔNG TRẠI ĐƯỢC CHIA SẺ */}
        <form onSubmit={handleGuestSubmit} className="space-y-3">
          <div className="text-left">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              👀 Xem nông trại được chia sẻ (Chế độ Khách)
            </label>
            <input
              type="text"
              value={guestUid}
              onChange={(e) => setGuestUid(e.target.value)}
              placeholder="Dán mã UID được bạn bè chia sẻ vào đây..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant text-sm font-mono focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-secondary text-white rounded-lg font-semibold text-xs hover:bg-secondary/90 transition-colors shadow-sm"
          >
            Vào Xem Nông Trại Này
          </button>
        </form>
      </div>
    </div>
  );
}