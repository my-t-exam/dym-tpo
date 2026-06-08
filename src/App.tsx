/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, User, GraduationCap, Building2, Languages, HelpCircle, ChevronRight, Layers, Users, LogOut, Key, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import ExamPortal from './components/ExamPortal';
import AdminPanel from './components/AdminPanel';
import { Member, Language } from './types';
import { 
  getStoredMembers, saveMembers, getStoredLanguage, saveLanguage, initSharedDatabase
} from './lib/database';
import { translations } from './data/translations';

export default function App() {
  const [lang, setLang] = useState<Language>('vi');
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isDbReady, setIsDbReady] = useState(false);

  // Secure password-supported authentication fields
  const [loginTab, setLoginTab] = useState<'member' | 'admin'>('member');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password-change dialog states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');

  // Load identity and language configurations
  useEffect(() => {
    const loadDb = async () => {
      await initSharedDatabase();
      const storedM = getStoredMembers();
      setMembers(storedM);
      
      // We always default to the login screen upon opening the web app (force login screens as requested)
      setCurrentMember(null);

      const storedLang = getStoredLanguage();
      setLang(storedLang);
      setIsDbReady(true);
    };

    loadDb();

    // Start background sync every 10 seconds to sync with other browsers in real-time
    const intervalId = setInterval(async () => {
      await initSharedDatabase();
      const storedM = getStoredMembers();
      setMembers(storedM);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    setCurrentMember(null);
    localStorage.removeItem('employee_testing_current_member_id');
    setIsAdminMode(false);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.toLowerCase().trim();
    if (!cleanEmail) return;

    // Load fresh members list to grab newly-registered passwords correctly
    const storedM = getStoredMembers();
    const matched = storedM.find(m => m.email.toLowerCase().trim() === cleanEmail);

    if (!matched) {
      setLoginError(lang === 'vi' 
        ? 'Email này chưa được đăng ký trong hệ thống. Vui lòng liên hệ ban nhân sự hoặc bộ phận Admin để đăng ký trước!' 
        : 'この電子メールアドレスはシステムに登録されていません。まずは管理者の方にメールアドレスを登録してもらってください。'
      );
      return;
    }

    if (loginTab === 'member') {
      // Employees and Admins login easily to take exams
      setCurrentMember(matched);
      localStorage.setItem('employee_testing_current_member_id', matched.id);
      setLoginEmail('');
      setLoginError('');
      setIsAdminMode(false);
    } else {
      // Admins and Superadmins require email + password
      if (matched.role === 'member') {
        setLoginError(lang === 'vi' 
          ? 'Đây là tài khoản nhân vật thông thường. Vui lòng chuyển sang tab "Nhân viên" để vào hệ thống thi!' 
          : 'これは一般社内メンバーアカウントです。従業員タブに切り替えてログインしてください。'
        );
        return;
      }

      const cleanPass = loginPassword.trim();
      if (!cleanPass) {
        setLoginError(lang === 'vi' ? 'Vui lòng nhập mật khẩu tài khoản quản trị!' : '管理者のパスワードを入力してください。');
        return;
      }

      // Check password
      const storedPass = matched.password || 'dym123';
      if (storedPass !== cleanPass) {
        setLoginError(lang === 'vi' ? 'Mật khẩu quản trị chưa chính xác!' : 'パスワードが正しくありません。');
        return;
      }

      // Success login for administrative account
      setCurrentMember(matched);
      localStorage.setItem('employee_testing_current_member_id', matched.id);
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      setIsAdminMode(true); // default to management view for administrative accounts
    }
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setLoginError(lang === 'vi' ? 'Đăng nhập Google thất bại!' : 'Googleログインに失敗しました。');
      return;
    }
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email = decoded.email?.toLowerCase().trim();
      if (!email) {
        setLoginError(lang === 'vi' ? 'Không tìm thấy email từ tài khoản Google!' : 'Googleアカウントからメールアドレスを取得できませんでした。');
        return;
      }

      // Load fresh members list to check active accounts
      const storedM = getStoredMembers();
      const matched = storedM.find(m => m.email.toLowerCase().trim() === email);

      if (!matched) {
        setLoginError(lang === 'vi'
          ? `Tài khoản Google (${email}) chưa được đăng kí trong hệ thống. Vui lòng liên hệ ban nhân sự hoặc bộ phận Admin!`
          : `このGoogleアカウント（${email}）は登録されていません。管理者にメールアドレスの登録をご依頼ください。`
        );
        return;
      }

      // Successful login
      setCurrentMember(matched);
      localStorage.setItem('employee_testing_current_member_id', matched.id);
      
      // Auto-set admin mode for admin/superadmin accounts
      if (matched.role === 'superadmin' || matched.role === 'admin') {
        setIsAdminMode(true);
      } else {
        setIsAdminMode(false);
      }

      setLoginError('');
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      console.error('JWT decode error:', err);
      setLoginError(lang === 'vi' ? 'Lỗi giải mã thông tin tài khoản Google!' : 'Googleアカウント情報のデコード中にエラーが発生しました。');
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember || (currentMember.role !== 'admin' && currentMember.role !== 'superadmin')) return;

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError(lang === 'vi' ? 'Mật khẩu mới nhập lại không khớp!' : '確認用パスワードが一致しません。');
      return;
    }

    if (newPassword.trim().length === 0) {
      setChangePasswordError(lang === 'vi' ? 'Mật khẩu mới không được để trống!' : '新しいパスワードを入力してください。');
      return;
    }

    const cleanOld = oldPassword.trim();
    const storedM = getStoredMembers();
    const matchedIdx = storedM.findIndex(m => m.id === currentMember.id);

    if (matchedIdx >= 0) {
      const matched = storedM[matchedIdx];
      const actualOld = matched.password || 'dym123';
      
      if (actualOld !== cleanOld) {
        setChangePasswordError(lang === 'vi' ? 'Mật khẩu hiện tại không đúng!' : '現在のパスワードが正しくありません。');
        return;
      }

      // Assign and store
      storedM[matchedIdx].password = newPassword.trim();
      saveMembers(storedM);
      
      // Update local states
      setCurrentMember({ ...currentMember, password: newPassword.trim() });
      setMembers(storedM);

      // Clean form state and release modal
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setChangePasswordError('');
      setShowChangePasswordModal(false);
      alert(lang === 'vi' ? 'Đổi mật khẩu thành công!' : 'パスワードの変更に成功しました。');
    }
  };

  const handleMembersChange = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    if (currentMember) {
      const found = updatedMembers.find(m => m.id === currentMember.id);
      if (found) {
        setCurrentMember(found);
      } else {
        handleLogout();
      }
    }
  };

  const handleLangToggle = (selectedLang: Language) => {
    setLang(selectedLang);
    saveLanguage(selectedLang);
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#122448] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#122448] font-bold text-sm tracking-wide">
            Đang tải dữ liệu thi cử...
          </p>
        </div>
      </div>
    );
  }

  const t = translations[lang];

  return (
    <div className="bg-[#FDFBF7] min-h-screen flex flex-col font-sans selection:bg-[#D4A373]/30 selection:text-[#5A5A40]" id="app-root-view">
      
      {/* 2. MAIN NAV BAR GREETINGS */}
      <nav className="bg-white/70 backdrop-blur-md text-[#1A1A1A] border-b border-[#E5E2D9] py-3 px-4 sm:px-6 lg:px-8 shadow-xs shrink-0 select-none" id="universal-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#5A5A40] rounded-xl text-white">
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="text-[10px] text-[#5A5A40]/70 font-bold block uppercase tracking-wider leading-none">
                DYM Vietnam
              </span>
              <span className="text-sm font-bold text-[#1A1A1A] tracking-tight block mt-1">
                {t.portalTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentMember && (
              <div className="hidden lg:flex flex-col text-right mr-3 border-r border-[#E5E2D9] pr-3">
                <span className="text-xs font-bold text-slate-800 leading-none">{currentMember.name}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-1">
                  {currentMember.department} • {currentMember.role === 'superadmin' ? 'Super Admin' : currentMember.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>
            )}

            {/* Language Switch Tag buttons */}
            <div className="flex items-center bg-[#5A5A40]/10 border border-[#5A5A40]/20 rounded-lg p-0.5 overflow-hidden mr-1.5">
              <button
                onClick={() => handleLangToggle('vi')}
                className={`px-2 py-1 rounded text-[10px] font-extrabold cursor-pointer transition ${lang === 'vi' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] hover:bg-[#5A5A40]/10'}`}
              >
                VN
              </button>
              <button
                onClick={() => handleLangToggle('ja')}
                className={`px-2 py-1 rounded text-[10px] font-extrabold cursor-pointer transition ${lang === 'ja' ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] hover:bg-[#5A5A40]/10'}`}
              >
                JP
              </button>
            </div>

            {/* Change Password option for administrative accounts */}
            {currentMember && (currentMember.role === 'admin' || currentMember.role === 'superadmin') && (
              <button
                onClick={() => {
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setChangePasswordError('');
                  setShowChangePasswordModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                title={lang === 'vi' ? 'Đổi mật khẩu' : 'パスワード変更'}
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{lang === 'vi' ? 'Đổi mật khẩu' : 'パスワード変更'}</span>
              </button>
            )}

            {/* Display Portal toggle ONLY if current user is an Admin or Super Admin */}
            {currentMember && currentMember.role !== 'member' ? (
              <button
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border cursor-pointer ${
                  isAdminMode
                    ? 'bg-[#F9F8F5] hover:bg-[#F0EFEA] text-[#5A5A40] border-[#E5E2D9] shadow-xs'
                    : 'bg-[#5A5A40] hover:bg-[#4D4D36] text-white border-transparent shadow-xs'
                }`}
                id="toggle-admin-btn"
                title={isAdminMode ? "Switch to Employee Portal" : "Switch to Admin Portal"}
              >
                {isAdminMode ? (
                  <>
                    <User className="w-3.5 h-3.5" />
                    Employee Portal
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Management Portal
                  </>
                )}
              </button>
            ) : currentMember ? (
              <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>Mode: Employee</span>
              </div>
            ) : null}

            {/* Direct Sign-Out active button */}
            {currentMember && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 rounded-lg text-xs font-bold transition cursor-pointer font-sans"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* 3. CORE ROUTING SWAPPER */}
      <div className="grow" id="main-content-flow">
        {!currentMember ? (
          <div className="max-w-md mx-auto my-16 px-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-[#E5E2D9] shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#5A5A40]/10 text-[#5A5A40] rounded-xl flex items-center justify-center mx-auto border border-[#5A5A40]/15">
                  <Key className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 font-serif">
                  {lang === 'vi' ? 'DYM Vietnam - Đăng Nhập' : 'DYM Vietnam ログイン'}
                </h2>
                <p className="text-xs text-[#5A5A40]/70 font-semibold">
                  {lang === 'vi' 
                    ? 'Vui lòng đăng nhập để bắt đầu tham gia bài thi đánh giá TPO định kỳ.' 
                    : '定期試験への回答を開始するためにログインしてください。'}
                </p>
              </div>

              {/* Secure login tabs selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('member');
                    setLoginError('');
                  }}
                  className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${loginTab === 'member' ? 'bg-white text-[#5A5A40] shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  👥 {lang === 'vi' ? 'Nhân viên' : '一般従業員'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginTab('admin');
                    setLoginError('');
                  }}
                  className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${loginTab === 'admin' ? 'bg-white text-[#5A5A40] shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  🛡️ {lang === 'vi' ? 'Quản trị viên' : '管理者ログイン'}
                </button>
              </div>

              {/* Google Sign-In Options */}
              <div className="flex flex-col items-center justify-center pt-2 pb-2 space-y-4">
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      setLoginError(lang === 'vi' ? 'Đăng nhập Google thất bại!' : 'Googleログインに失敗しました。');
                    }}
                    theme="filled_blue"
                    size="large"
                    shape="pill"
                    text="continue_with"
                  />
                </div>
                
                <div className="relative flex py-1 items-center w-full">
                  <div className="flex-grow border-t border-[#E5E2D9]"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    {lang === 'vi' ? 'Hoặc nhập thủ công' : 'または手動入力'}
                  </span>
                  <div className="flex-grow border-t border-[#E5E2D9]"></div>
                </div>
              </div>

              {loginError && (
                <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-lg text-xs leading-relaxed">
                  <div className="font-bold text-rose-600">{loginError}</div>
                </div>
              )}

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    {lang === 'vi' ? 'Email Công ty' : '会社用メールアドレス'}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={loginTab === 'member' ? 'lan.nt@dymvietnam.net' : 'my-t@dymvietnam.net'}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-3 text-xs outline-none focus:border-[#5A5A40] font-bold tracking-wide transition shadow-xs"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginError('');
                    }}
                  />
                </div>

                {loginTab === 'admin' && (
                  <div className="animate-in fade-in duration-150">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      {lang === 'vi' ? 'Mật khẩu quản trị' : '管理パスワード'}
                    </label>
                    <input
                      type="password"
                      required
                      placeholder={lang === 'vi' ? 'Nhập mật khẩu' : 'パスワードを入力してください'}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-3 text-xs outline-none focus:border-[#5A5A40] font-bold tracking-wide transition shadow-xs"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#5A5A40] hover:bg-[#4D4D36] text-white rounded-lg font-bold text-xs transition shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  {lang === 'vi' ? 'Xác nhận vào hệ thống' : 'システムにサインイン'}
                  <ChevronRight className="w-4 h-4" />
                </button>

              </form>

              <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/10 rounded-xl p-4 text-[11px] text-[#5A5A40] space-y-1.5 leading-relaxed font-medium">
                <span className="font-bold flex items-center gap-1 text-[#5A5A40]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4A373]"></span>
                  {lang === 'vi' ? 'HƯỚNG DẪN TRUY CẬP:' : 'ログインのガイダンス:'}
                </span>
                <p className="opacity-90">
                  {lang === 'vi' 
                    ? '1. Nếu là Nhân viên: Chỉ cần nhập địa chỉ Email đã được Admin/Super Admin thêm vào hệ thống để bắt đầu làm bài trực tiếp (Không cần mật khẩu).'
                    : '1. 一般社員の方：管理者に登録された会社メールアドレスを入力するだけで受検可能です（パスワードは不要です）。'}
                </p>
                <p className="opacity-90">
                  {lang === 'vi' 
                    ? '2. Nếu là Quản trị viên (Super Admin / Admin): Chuyển sang tab "Quản trị viên", nhập Email và Mật khẩu của bạn để quản lý đề thi và xem kết quả. Mật khẩu khởi tạo mặc định cho các tài khoản mẫu ban đầu là: "dym123".'
                    : '2. 管理者・最高管理者の方：管理者タブを選択し、メールアドレスとパスワードを入力してください。初期代表アカウントの規定パスワードは「dym123」に設定されています。'}
                </p>
              </div>
            </div>
          </div>
        ) : isAdminMode && currentMember && currentMember.role !== 'member' ? (
          <AdminPanel 
            onBackToPortal={() => setIsAdminMode(false)} 
            currentMember={currentMember}
            lang={lang}
            onMembersChange={handleMembersChange}
          />
        ) : (
          <div className="relative animate-in fade-in duration-300">
            {/* Soft Branding Decorative Header */}
            <div className="bg-[#5A5A40] text-white/90 pt-10 pb-20 text-center px-4 shrink-0 relative overflow-hidden" id="marketing-canvas">
              <div className="absolute inset-0 bg-[radial-gradient(#D4A373_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
              <div className="max-w-3xl mx-auto space-y-3 relative z-10 animate-in fade-in slide-in-from-top-4 duration-500">
                
                <div className="inline-flex items-center gap-1.5 bg-white/10 text-white border border-white/20 px-5 py-2 rounded-full text-sm sm:text-base tracking-widest font-black uppercase shadow-xs">
                  <Sparkles className="w-4.5 h-4.5 text-[#D4A373] animate-pulse" />
                  DYM VIETNAM
                </div>
                
                <h1 className="text-2xl sm:text-3.5xl font-black text-white px-2 tracking-tight pt-2 uppercase leading-tight">
                  {lang === 'vi' 
                    ? 'CHÀO MỪNG BẠN ĐẾN VỚI KÌ THI KIỂM TRA TPO ĐỊNH KỲ TẠI DYM VIETNAM' 
                    : 'DYM VIETNAM 定期TPOテストへようこそ'}
                </h1>
                
                {/* Simulated Greeting Text banner */}
                {currentMember && (
                  <p className="text-[#F5EBE0] text-xs font-bold font-mono tracking-wider bg-black/25 px-4 py-1.5 rounded-full w-max mx-auto border border-white/15">
                    Hello employee:{" "}
                    <span className="font-serif italic underline text-white">{currentMember.name}</span> 
                    {` (${currentMember.department})`}
                  </p>
                )}

                {/* TPO Motto Box (Requirement) */}
                <div className="bg-white/95 text-slate-800 rounded-xl p-4 mt-6 text-left shadow-lg border border-slate-200 max-w-xl mx-auto space-y-3" id="tpo-motto-callout">
                  <h3 className="font-bold text-center text-xs text-[#5A5A40] uppercase tracking-wider border-b border-slate-100 pb-1.5 leading-relaxed">
                    {lang === 'vi' ? (
                      <span>💡<br />TPO LÀ GÌ?</span>
                    ) : '💡 TPOとは？'}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#5A5A40]/5 rounded-lg border border-[#5A5A40]/10">
                      <span className="font-black text-[#5A5A40] text-sm block">T</span>
                      <span className="text-[10px] text-slate-400 font-bold">Time (Thời gian)</span>
                    </div>
                    <div className="p-2 bg-[#5A5A40]/5 rounded-lg border border-[#5A5A40]/10">
                      <span className="font-black text-[#5A5A40] text-sm block">P</span>
                      <span className="text-[10px] text-slate-400 font-bold">Place (Địa điểm)</span>
                    </div>
                    <div className="p-2 bg-[#5A5A40]/5 rounded-lg border border-[#5A5A40]/10">
                      <span className="font-black text-[#5A5A40] text-sm block">O</span>
                      <span className="text-[10px] text-slate-400 font-bold">Occasion (Bối cảnh)</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#5A5A40] font-bold text-center leading-relaxed">
                    {lang === 'vi' 
                      ? 'Đúng giờ – Phản hồi nhanh – Ứng xử chuyên nghiệp – Trang phục và thái độ phù hợp với mọi hoàn cảnh.'
                      : '=> 常に時間を守り、迅速に対応し、いかなる空間・服装・態度であっても適切な行動・マナーを維持すること'}
                  </p>
                </div>

              </div>
            </div>

            {/* Float ExamPortal inside the offset space */}
            <div className="mt-[-60px] pb-16 relative z-10" id="portal-floating-nest">
              <ExamPortal currentMember={currentMember} lang={lang} />
            </div>

            {/* Elegant Business Footer credit lines */}
            <footer className="text-center pb-12 text-[#5A5A40]/70 text-[11px] font-semibold tracking-wide space-y-1 select-none" id="branding-footer">
              <div className="flex items-center justify-center gap-1.5 opacity-85 mb-2">
                <Building2 className="w-4 h-4 text-[#5A5A40]/60" />
                <span>Hoạt động bảo mật và vận hành theo quy định Bảo mật Dữ liệu DYM Vietnam.</span>
              </div>
              <p>© 2026 DYM Vietnam Co., Ltd. Tất cả quyền được quản trị an toàn.</p>
            </footer>
          </div>
        )}
      </div>

      {/* PASSWORD CHANGE MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#5A5A40]" />
                {lang === 'vi' ? 'Đổi Mật Khẩu Quản Trị' : '管理者パスワードの変更'}
              </h3>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              {changePasswordError && (
                <div className="bg-rose-50 text-rose-600 border border-rose-100 p-3 rounded-lg text-xs font-bold font-sans">
                  {changePasswordError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {lang === 'vi' ? 'Mật khẩu hiện tại (nhập "dym123" nếu là lần đầu)' : '現在のパスワード'}
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    setChangePasswordError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {lang === 'vi' ? 'Mật khẩu mới' : '新しいパスワード'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setChangePasswordError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {lang === 'vi' ? 'Nhập lại mật khẩu mới' : '新しいパスワード (確認)'}
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    setChangePasswordError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-lg cursor-pointer transition text-center"
                >
                  {lang === 'vi' ? 'Hủy bỏ' : 'キャンセル'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4D4D36] text-white font-bold text-xs rounded-lg cursor-pointer transition shadow-xs text-center"
                >
                  {lang === 'vi' ? 'Lưu Thay Đổi' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
