/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit, Save, Settings, Users, Clipboard, PlusCircle, 
  Trash, ArrowLeft, RefreshCw, Layers, Clock, Calendar, CheckSquare, 
  Eye, Check, AlertTriangle, CloudLightning, ChevronRight, GraduationCap, X, Sparkles, Building2, UserCheck, Search, Database
} from 'lucide-react';
import { Exam, Question, Submission, Member, Language, AuditLog } from '../types';
import { 
  getStoredExams, saveExams, getStoredSubmissions, 
  saveSubmissions, getStoredSheetsUrl, saveSheetsUrl, 
  syncWithGoogleSheets, getStoredMembers, saveMembers,
  getStoredDepartments, saveDepartments, getStoredTeams, saveStoredTeams,
  getStoredAuditLogs, saveAuditLogs, addAuditLog
} from '../lib/database';
import GasExport from './GasExport';
import { translations } from '../data/translations';
import { getSyncedTime, parseAsVietnamTime, formatInVietnamTime, formatToVietnamLocalInput } from '../lib/time';

interface AdminPanelProps {
  onBackToPortal: () => void;
  currentMember: Member | null;
  lang: Language;
  onMembersChange?: (updatedMembers: Member[]) => void;
}

export default function AdminPanel({ onBackToPortal, currentMember, lang, onMembersChange }: AdminPanelProps) {
  const t = translations[lang];

  // Database states
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  
  // Master departments list (Admin/Super Admin managed)
  const [departmentsList, setDepartmentsList] = useState<string[]>(getStoredDepartments());
  const [newDeptName, setNewDeptName] = useState('');

  // Selection Tabs: exams, submissions, members, dashboard, audit
  const [activeTab, setActiveTab] = useState<'exams' | 'submissions' | 'members' | 'dashboard' | 'audit'>('exams');
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExamFilter, setSelectedExamFilter] = useState('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [dashboardExamId, setDashboardExamId] = useState<string>('');
  
  // New filters for dashboard & member directory
  const [dashboardDeptFilter, setDashboardDeptFilter] = useState<string>('all');
  const [dashboardTeamFilter, setDashboardTeamFilter] = useState<string>('all');
  const [dashboardDateFilter, setDashboardDateFilter] = useState<string>('');
  const [memberListDeptFilter, setMemberListDeptFilter] = useState<string>('all');
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);

  // New Exam & Submissions filters (Requirement 5 & Requirement 6)
  const [examsDeptFilter, setExamsDeptFilter] = useState<string>('all');
  const [examsTeamFilter, setExamsTeamFilter] = useState<string>('all');
  const [examsDateFilter, setExamsDateFilter] = useState<string>('');
  const [submissionsDateFilter, setSubmissionsDateFilter] = useState<string>('');

  // Exam Form States
  const [editingExamId, setEditingExamId] = useState<string | null>(null); // 'new' vs exam.id vs null
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDuration, setFormDuration] = useState(15);
  const [formQuestions, setFormQuestions] = useState<Question[]>([]);
  const [formDepartment, setFormDepartment] = useState('All');
  const [formTeam, setFormTeam] = useState('');

  // Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberDept, setNewMemberDept] = useState(getStoredDepartments()[0] || '業務部');
  const [newMemberRole, setNewMemberRole] = useState<'superadmin' | 'admin' | 'member'>('member');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [deptTeams, setDeptTeams] = useState<Record<string, string[]>>(getStoredTeams());
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDept, setNewTeamDept] = useState(currentMember?.role === 'admin' ? currentMember.department : (getStoredDepartments()[0] || 'IT部'));
  const [newMemberTeam, setNewMemberTeam] = useState('');
  const [memberListTeamFilter, setMemberListTeamFilter] = useState('all');

  // Detailed Submission Modal View
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Custom confirmation & alert modal state
  const [customModal, setCustomModal] = useState<{
    type: 'confirm' | 'alert';
    titleVi: string;
    titleJa: string;
    messageVi: string;
    messageJa: string;
    onConfirm?: () => void;
  } | null>(null);

  // Sync state managers
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  // Load local databases on mount or currentMember change and refresh periodically in background
  useEffect(() => {
    const refreshData = () => {
      setExams(getStoredExams());
      setSheetsUrl(getStoredSheetsUrl());
      setAuditLogs(getStoredAuditLogs());
      
      const storedM = getStoredMembers();
      const allSubs = getStoredSubmissions();

      if (currentMember && currentMember.role === 'admin') {
        const userDept = currentMember.department;
        setSelectedDeptFilter(userDept);
        
        // Filter members of admin department
        const deptMembers = storedM.filter(m => m.department === userDept);
        setMembers(deptMembers);

        // Filter submissions of admin department
        const deptSubs = allSubs.filter((sub) => {
          const matchM = storedM.find(m => m.email.toLowerCase().trim() === sub.employeeEmail?.toLowerCase().trim());
          const candidateDept = matchM?.department || sub.employeeDepartment;
          return candidateDept === userDept;
        });
        setSubmissions(deptSubs);
      } else {
        setMembers(storedM);
        setSubmissions(allSubs);
        setSelectedDeptFilter('all');
      }
    };

    refreshData();

    // Refresh dashboard UI state from synchronized cache every 10 seconds
    const intervalId = setInterval(refreshData, 10000);
    return () => clearInterval(intervalId);
  }, [currentMember]);

  // Handle dashboard default exam trigger
  useEffect(() => {
    if (exams.length > 0 && !dashboardExamId) {
      setDashboardExamId(exams[0].id);
    }
  }, [exams, dashboardExamId]);

  // Safeguard activeTab based on currentMember role
  useEffect(() => {
    if (currentMember && currentMember.role !== 'superadmin' && currentMember.role !== 'admin' && (activeTab === 'members' || activeTab === 'sheets')) {
      setActiveTab('exams');
    }
  }, [currentMember, activeTab]);

  // Check if current logged-in user is authorized to open Admin area
  const authorized = currentMember && (currentMember.role === 'superadmin' || currentMember.role === 'admin');

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm" id="unauthorized-message">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg leading-tight">{lang === 'vi' ? 'Từ chối truy cập!' : 'アクセス拒否'}</h3>
        <p className="text-slate-500 text-xs mt-2 leading-relaxed">
          {t.notAllowedAdmin}
        </p>
        <button
          onClick={onBackToPortal}
          className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer"
        >
          {t.backToExamList}
        </button>
      </div>
    );
  }

  // Save sheets URL connection
  const handleSaveSheetsUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMember?.role !== 'superadmin') {
      alert(lang === 'vi' 
        ? 'Chỉ có Super Admin mới thực hiện được hành động này.' 
        : 'この操作は Super Admin のみ実行可能です。'
      );
      return;
    }
    saveSheetsUrl(sheetsUrl);
    addAuditLog(
      lang === 'vi' ? 'Cấu hình Google Sheets' : 'Google Sheets設定',
      currentMember?.name || 'Unknown',
      currentMember?.email || 'unknown@dymvietnam.net',
      lang === 'vi' 
        ? `Đã cập nhật Web App URL kết nối Google Sheets: "${sheetsUrl || 'Đã xóa URL'}"`
        : `Google Sheets連携のWeb App URLを更新しました: "${sheetsUrl || 'URLの削除'}"`
    );
    setAuditLogs(getStoredAuditLogs());
    alert(lang === 'vi' ? 'Đã kích hoạt lưu liên kết kết nối Google Sheet thành công!' : 'GoogleスプレッドシートのWeb App接続が更新されました！');
  };

  // Sync a single submission back to Sheets
  const handleSyncToSheets = async (sub: Submission) => {
    if (!sheetsUrl) {
      alert(lang === 'vi' ? 'Vui lòng cấu hình URL Google Sheets trước khi đồng bộ!' : 'GoogleスプレッドシートのWeb App URLを設定してください！');
      setActiveTab('sheets');
      return;
    }
    setSyncingId(sub.id);
    const success = await syncWithGoogleSheets(sheetsUrl, sub);
    setSyncingId(null);
    if (success) {
      alert((lang === 'vi' ? 'Đã hoàn tất đồng bộ kết quả của: ' : '同期に成功しました: ') + sub.employeeName);
    } else {
      alert(lang === 'vi' ? 'Có lỗi xảy ra khi đồng bộ. Hãy kiểm tra lại Apps Script Deploy URL.' : '送信エラーが発生しました。接続およびURLを確認してください。');
    }
  };

  // CSV Export utility (integrated from separate export page - Requirement 6)
  const exportSubmissionsToCSV = (listToExport: Submission[]) => {
    if (listToExport.length === 0) {
      alert(lang === 'vi' ? 'Không có kết quả thi nào để xuất!' : 'エクスポート対象のデータがありません。');
      return;
    }

    // Define CSV Headers
    const headers = lang === 'vi' 
      ? ["Thời Gian Nộp", "Họ Tên", "Email", "Bộ Phận", "Đề Thi", "Điểm Số", "Điểm Tối Đa", "Tỉ Lệ Đạt %", "Thời Gian Làm Bài", "Cách Thức Nộp"]
      : ["提出日時", "氏名", "メールアドレス", "所属部署", "試験名", "獲得スコア", "最大スコア", "正解率 %", "解答時間", "提出方法"];

    // Format rows
    const rows = listToExport.map(sub => {
      const rate = Math.round((sub.score / (sub.maxScore || 1)) * 100) || 0;
      const durationStr = sub.timeTakenSeconds 
        ? (lang === 'vi' 
            ? `${Math.floor(sub.timeTakenSeconds / 60)} phút ${sub.timeTakenSeconds % 60} giây` 
            : `${Math.floor(sub.timeTakenSeconds / 60)}分${sub.timeTakenSeconds % 60}秒`)
        : (lang === 'vi' ? 'Dưới 1 phút' : '1分未満');
      
      const submitType = sub.isAutoSubmitted 
        ? (lang === 'vi' ? 'Tự động (Hết giờ)' : '自動提出 (時間切れ)')
        : (lang === 'vi' ? 'Chủ động nộp' : '手動提出');

      const fields = [
        sub.submittedAt || '',
        sub.employeeName || '',
        sub.employeeEmail || '',
        sub.employeeDepartment || 'N/A',
        sub.examTitle || '',
        sub.score,
        sub.maxScore,
        `${rate}%`,
        durationStr,
        submitType
      ];

      // Escape quotes in data
      return fields.map(field => {
        const val = String(field).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });

    // Content with UTF-8 BOM to prevent Excel display encoding issue
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');

    // Create a download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `DYM_TPO_Results_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sync ALL submissions to Google Sheets with Integrated CSV Export (Requirement 6)
  const handleSyncAll = async () => {
    if (filteredSubmissions.length === 0) {
      alert(lang === 'vi' ? 'Không có dữ liệu bài làm khả dụng khớp với bộ lọc để xuất!' : '同期対象の受検記録がありません。');
      return;
    }

    // 1. Instantly trigger CSV download (integrated as requested)
    exportSubmissionsToCSV(filteredSubmissions);

    // 2. Proceed to sheets sync if configured
    if (!sheetsUrl) {
      alert(lang === 'vi' 
        ? 'Đã tải xuống file CSV kết quả! (Lưu ý: Chưa đồng bộ Google Sheets do URL kết nối chưa cấu hình ở thiết lập bên dưới)' 
        : 'CSVファイルをダウンロードしました！（注意: Googleスプレッドシート同期URLが未設定です）');
      return;
    }
    
    const confirmSync = window.confirm(lang === 'vi' 
      ? `Đã tải về file CSV của ${filteredSubmissions.length} lượt thi này! Bạn có muốn tiếp tục đồng bộ trực tuyến lên Google Sheet không?`
      : `表示中の受験結果 (${filteredSubmissions.length} 件) のCSVダウンロードが完了しました。オンラインでGoogleスプレッドシートへの書き出し同期を続行しますか？`
    );
    if (!confirmSync) return;

    setSyncingAll(true);
    let successCount = 0;
    for (const sub of filteredSubmissions) {
      const success = await syncWithGoogleSheets(sheetsUrl, sub);
      if (success) successCount++;
    }
    setSyncingAll(false);
    alert(lang === 'vi'
      ? `Đồng bộ hoàn tất: đã gửi thành công ${successCount}/${filteredSubmissions.length} dòng kết quả lên Trang tính trực tuyến.`
      : `同期完了: ${successCount}/${filteredSubmissions.length} 件が書き出されました。`
    );
  };

  // Check if current user has permission to edit/delete the exam (Super Admin can do all, Admin can only manage their own created exams)
  const checkCanManageExam = (exam: Exam): boolean => {
    if (!currentMember) return false;
    if (currentMember.role === 'superadmin') return true;
    if (currentMember.role === 'admin') {
      return !!exam.createdBy && exam.createdBy.toLowerCase().trim() === currentMember.email.toLowerCase().trim();
    }
    return false;
  };

  // Delete Exam
  const handleDeleteExam = (id: string) => {
    const exam = exams.find((x) => x.id === id);
    if (!exam) return;
    if (!checkCanManageExam(exam)) {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không có quyền',
        titleJa: '権限がありません',
        messageVi: 'Bạn không có quyền xóa đề thi này. Chỉ Admin hoặc Super Admin mới có quyền.',
        messageJa: 'この試験を削除する権限がありません。管理者のみ削除可能です。',
      });
      return;
    }
    
    setCustomModal({
      type: 'confirm',
      titleVi: 'Xác Nhận Xóa Đề Kiểm Tra',
      titleJa: '試験問題の削除確認',
      messageVi: `CẢNH BÁO: Bạn có thực sự chắc chắn muốn xóa đề thi "${exam.title}" khỏi hệ thống không? Tất cả các lượt thi liên quan vẫn lưu ở lịch sử nhưng đề thi sẽ không thể truy cập được nữa.`,
      messageJa: `警告: 試験 "${exam.title}" を本当に削除しますか？関連する過去の受験記録は保持されますが、新規受検はできなくなります。`,
      onConfirm: () => {
        const updated = exams.filter((x) => x.id !== id);
        setExams(updated);
        saveExams(updated);
        addAuditLog(
          lang === 'vi' ? 'Xóa đề thi' : '試験問題の削除',
          currentMember?.name || 'Unknown',
          currentMember?.email || 'unknown@dymvietnam.net',
          lang === 'vi' 
            ? `Đã xóa đề thi: "${exam.title}"` 
            : `試験問題を削除しました: "${exam.title}"`
        );
        setAuditLogs(getStoredAuditLogs());
        setCustomModal(null);
      }
    });
  };

  // Initiate Exam Form Creation/Edit
  const startEditExam = (exam: Exam | 'new') => {
    if (exam !== 'new' && !checkCanManageExam(exam)) {
      alert(lang === 'vi' 
        ? 'Bạn không có quyền sửa đề thi này. Chỉ Super Admin hoặc người lập đề mới có quyền.' 
        : 'この試験を編集する権限がありません。作成者または Super Admin のみ編集可能です。'
      );
      return;
    }
    if (exam === 'new') {
      setEditingExamId('new');
      setFormTitle('');
      setFormDescription('');
      setFormDepartment('All');
      setFormTeam('');
      
      const now = getSyncedTime();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      setFormStartTime(formatToVietnamLocalInput(now));
      setFormEndTime(formatToVietnamLocalInput(tomorrow));
      setFormDuration(15);
      setFormQuestions([
        {
          id: 'q-initial-1',
          text: lang === 'vi' ? 'Quy định bảo mật thông tin DYM nào được áp dụng khi gửi tệp ra ngoài?' : '機密ファイルを社外へ送信する際の、DYM Vietnamの正しいセキュリティ基準は？',
          type: 'single',
          options: [
            lang === 'vi' ? 'Nén mật khẩu tệp và gửi mật khẩu qua một kênh riêng độc lập' : 'ファイルをパスワード付きZipで圧縮し、別チャネルでパスワードを送信する',
            lang === 'vi' ? 'Gửi tệp trực tiếp qua hòm thư công cộng không mã hóa' : 'ファイルを暗号化せずに通常のメールで直接添付送信する',
            lang === 'vi' ? 'Tải tệp lên mạng xã hội cá nhân để đối tác tự tải về' : '個人のSNS等にアップロードし、相手にダウンロードしてもらう',
          ],
          correctAnswers: [0],
          points: 10
        }
      ]);
    } else {
      setEditingExamId(exam.id);
      setFormTitle(exam.title);
      setFormDescription(exam.description);
      setFormStartTime(exam.startTime);
      setFormEndTime(exam.endTime);
      setFormDuration(exam.duration);
      setFormDepartment(exam.department || 'All');
      setFormTeam(exam.team || '');
      setFormQuestions([...exam.questions]);
    }
  };

  // Form question builders
  const addQuestionToForm = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: lang === 'vi' ? 'Nội dung câu hỏi mới...' : '新しい問題...',
      type: 'single',
      options: [
        lang === 'vi' ? 'Lựa chọn phương án 1' : '選択肢 1',
        lang === 'vi' ? 'Lựa chọn phương án 2' : '選択肢 2'
      ],
      correctAnswers: [0],
      points: 10
    };
    setFormQuestions([...formQuestions, newQ]);
  };

  const removeQuestionFromForm = (index: number) => {
    if (formQuestions.length <= 1) {
      alert(lang === 'vi' ? 'Đề thi phải lưu trữ tối thiểu 1 câu hỏi!' : 'テスト問題は最低1つ以上登録してください。');
      return;
    }
    const q = [...formQuestions];
    q.splice(index, 1);
    setFormQuestions(q);
  };

  const updateQuestionText = (index: number, text: string) => {
    const q = [...formQuestions];
    q[index].text = text;
    setFormQuestions(q);
  };

  const updateQuestionType = (index: number, type: 'single' | 'multiple') => {
    const q = [...formQuestions];
    q[index].type = type;
    setFormQuestions(q);
  };

  const updateQuestionPoints = (index: number, points: number) => {
    const q = [...formQuestions];
    q[index].points = points;
    setFormQuestions(q);
  };

  const addOptionToQuestion = (qIdx: number) => {
    const q = [...formQuestions];
    q[qIdx].options.push((lang === 'vi' ? 'Thêm phương án ' : '新規選択肢 ') + (q[qIdx].options.length + 1));
    setFormQuestions(q);
  };

  const removeOptionFromQuestion = (qIdx: number, optIdx: number) => {
    const q = [...formQuestions];
    if (q[qIdx].options.length <= 2) {
      alert(lang === 'vi' ? 'Hành vi bị cấm: Phương án lựa chọn tối thiểu là 2!' : '選択肢は最低2つ必要です。');
      return;
    }
    q[qIdx].options.splice(optIdx, 1);
    // Adjust correction indices if any
    q[qIdx].correctAnswers = q[qIdx].correctAnswers
      .filter((x) => x !== optIdx)
      .map((x) => (x > optIdx ? x - 1 : x));
    
    // Ensure at least one correct answers index remains
    if (q[qIdx].correctAnswers.length === 0) {
      q[qIdx].correctAnswers = [0];
    }
    setFormQuestions(q);
  };

  const updateOptionText = (qIdx: number, optIdx: number, txt: string) => {
    const q = [...formQuestions];
    q[qIdx].options[optIdx] = txt;
    setFormQuestions(q);
  };

  const toggleOptionCorrectness = (qIdx: number, optIdx: number) => {
    const q = [...formQuestions];
    const currentCorrect = q[qIdx].correctAnswers;
    if (q[qIdx].type === 'single') {
      q[qIdx].correctAnswers = [optIdx];
    } else {
      if (currentCorrect.includes(optIdx)) {
        if (currentCorrect.length <= 1) {
          alert(lang === 'vi' ? 'Thiết lập bắt buộc: Phải chứa tối thiểu 1 phương án đúng!' : '正解の選択肢は最低1つ選択する必要があります。');
          return;
        }
        q[qIdx].correctAnswers = currentCorrect.filter((x) => x !== optIdx);
      } else {
        q[qIdx].correctAnswers = [...currentCorrect, optIdx].sort();
      }
    }
    setFormQuestions(q);
  };

  // Save the full constructed exam
  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert(lang === 'vi' ? 'Vui lòng bổ sung Tên tiêu đề đề thi!' : '試験タイトルを入力してください。');
      return;
    }

    const updatedExam: Exam = {
      id: editingExamId === 'new' ? `exam-${Date.now()}` : editingExamId!,
      title: formTitle.trim(),
      description: formDescription.trim(),
      startTime: formStartTime,
      endTime: formEndTime,
      duration: Number(formDuration) || 10,
      department: formDepartment,
      team: formTeam || undefined,
      questions: formQuestions,
      createdAt: new Date().toISOString(),
      createdBy: editingExamId === 'new' ? currentMember?.email : (exams.find(ex => ex.id === editingExamId)?.createdBy || currentMember?.email)
    };

    let updatedExamsList: Exam[] = [];
    if (editingExamId === 'new') {
      updatedExamsList = [...exams, updatedExam];
    } else {
      updatedExamsList = exams.map((ex) => (ex.id === editingExamId ? updatedExam : ex));
    }

    setExams(updatedExamsList);
    saveExams(updatedExamsList);
    addAuditLog(
      editingExamId === 'new' 
        ? (lang === 'vi' ? 'Tạo đề thi mới' : '新規試験問題作成')
        : (lang === 'vi' ? 'Cập nhật đề thi' : '試験問題更新'),
      currentMember?.name || 'Unknown',
      currentMember?.email || 'unknown@dymvietnam.net',
      lang === 'vi' 
        ? `Đã ${editingExamId === "new" ? "tạo" : "cập nhật"} đề thi: "${updatedExam.title}" (${updatedExam.questions.length} câu hỏi)` 
        : `試験問題 "${updatedExam.title}" を${editingExamId === "new" ? "作成" : "更新"}しました（${updatedExam.questions.length}問）`
    );
    setAuditLogs(getStoredAuditLogs());
    setEditingExamId(null);
    alert(t.saveSuccess);
  };

  // Function to delete exam submission / result and allow retaking
  const handleDeleteSubmission = (sub: Submission) => {
    if (!currentMember || (currentMember.role !== 'superadmin' && currentMember.role !== 'admin')) {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể thực hiện',
        titleJa: '操作を実行できません',
        messageVi: 'Chỉ có Admin hoặc Super Admin mới thực hiện được hành động này.',
        messageJa: 'この操作は管理者のみ実行可能です。',
      });
      return;
    }

    setCustomModal({
      type: 'confirm',
      titleVi: 'Xác Nhận Xóa Kết Quả Bài Thi',
      titleJa: '受験結果の削除確認',
      messageVi: `CẢNH BÁO: Bạn có thực sự muốn xóa kết quả bài thi "${sub.examTitle}" của nhân sự "${sub.employeeName}" (${sub.employeeEmail}) không? Sau khi xóa, nhân sự này sẽ được xóa kết quả thi cũ để làm bài thi mới. Hành động này không thể hoàn tác!`,
      messageJa: `警告: メンバー "${sub.employeeName}" (${sub.employeeEmail}) の試験 "${sub.examTitle}" の結果を本当に削除しますか？削除すると、この従業員の受験結果はクリアされ、新たに試験を受け直すことができるようになります。この操作は取り消せません！`,
      onConfirm: () => {
        const allSubs = getStoredSubmissions();
        const nextSubs = allSubs.filter(s => s.id !== sub.id);
        saveSubmissions(nextSubs);

        // Update local React state
        if (currentMember.role === 'admin') {
          const userDept = currentMember.department;
          const storedM = getStoredMembers();
          const deptSubs = nextSubs.filter((s) => {
            const matchM = storedM.find(m => m.email.toLowerCase().trim() === s.employeeEmail?.toLowerCase().trim());
            const candidateDept = matchM?.department || s.employeeDepartment;
            return candidateDept === userDept;
          });
          setSubmissions(deptSubs);
        } else {
          setSubmissions(nextSubs);
        }

        // Add to audit logs
        addAuditLog(
          lang === 'vi' ? 'Xóa kết quả thi' : '受験結果 of 削除',
          currentMember.name,
          currentMember.email,
          lang === 'vi'
            ? `Đã xóa kết quả bài thi "${sub.examTitle}" của nhân sự "${sub.employeeName}" (${sub.employeeEmail}) để cho phép thi lại.`
            : `メンバー "${sub.employeeName}" (${sub.employeeEmail}) の試験 "${sub.examTitle}" の結果を削除しました（再受験可能に設定）。`
        );
        
        setAuditLogs(getStoredAuditLogs());
        setCustomModal(null);
      }
    });
  };

  // --- MEMBERS DIRECTORY CODE SECTION ---
  // Super Admin / Admin can add a Member, Promote Member to Admin, Demote Admin, or delete members
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember || (currentMember.role !== 'superadmin' && currentMember.role !== 'admin')) {
      alert(lang === 'vi' 
        ? 'Chỉ có Super Admin hoặc Admin mới thực hiện được hành động này.' 
        : 'この操作は管理者のみ実行可能です。'
      );
      return;
    }
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert(lang === 'vi' ? 'Vui lòng điền đủ thông tin nhân sự!' : 'すべての項目を入力してください。');
      return;
    }

    const cleanedEmail = newMemberEmail.toLowerCase().trim();
    const storedM = getStoredMembers();
    if (storedM.some(m => m.email.toLowerCase().trim() === cleanedEmail)) {
      alert(lang === 'vi' ? 'Email nhân sự này đã tồn tại trên hệ thống.' : 'この電子メールは既に登録されています。');
      return;
    }

    // Force role = member, and department = admin's dept if current user is admin
    const resolvedRole = currentMember.role === 'admin' ? 'member' : newMemberRole;
    const resolvedDept = currentMember.role === 'admin' ? currentMember.department : newMemberDept;

    const added: Member = {
      id: `m-${Date.now()}`,
      name: newMemberName.trim(),
      email: cleanedEmail,
      role: resolvedRole,
      department: resolvedDept,
      team: newMemberTeam || undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentMember.email.toLowerCase().trim()
    };

    const nextM = [...storedM, added];
    saveMembers(nextM);
    
    addAuditLog(
      lang === 'vi' ? 'Thêm nhân viên' : 'メンバー登録',
      currentMember?.name || 'Unknown',
      currentMember?.email || 'unknown@dymvietnam.net',
      lang === 'vi' 
        ? `Đã thêm nhân viên mới: "${added.name}" (${added.email}) tại bộ phận ${added.department}${added.team ? ` - nhóm ${added.team}` : ''}`
        : `新規メンバー "${added.name}" (${added.email}) を "${added.department}" 部署${added.team ? ` - "${added.team}" チーム` : ''}に登録しました`
    );
    setAuditLogs(getStoredAuditLogs());
    
    if (currentMember.role === 'admin') {
      setMembers(nextM.filter(m => m.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim()));
    } else {
      setMembers(nextM);
    }

    if (onMembersChange) {
      onMembersChange(nextM);
    }

    // clear fields
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberTeam('');
    setNewMemberPassword('');
    setShowAddMemberModal(false);
    alert(lang === 'vi' ? 'Đã thêm thành viên mới thành công!' : '新規メンバーを登録しました。');
  };

  // Direct role updates for easy permission tuning
  const handleUpdateMemberRole = (memberId: string, newRole: 'superadmin' | 'admin' | 'member') => {
    if (currentMember?.role !== 'superadmin') {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể thực hiện',
        titleJa: '操作を実行できません',
        messageVi: 'Chỉ có Super Admin mới thực hiện được hành động này.',
        messageJa: 'この操作は Super Admin のみ実行可能です。',
      });
      return;
    }
    const target = members.find(m => m.id === memberId);
    if (!target) return;

    // Check self-modification safeguard only if not superadmin (superadmin can edit themselves as per request)
    if (target.email.toLowerCase().trim() === currentMember?.email?.toLowerCase().trim() && currentMember?.role !== 'superadmin') {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể tự hạ cấp',
        titleJa: '自己降格不可',
        messageVi: 'Bạn không thể tự hạ cấp hoặc thay đổi vai trò của tài khoản đang đăng nhập hiện tại.',
        messageJa: '現在ログイン中の自身のアカウントの権限は変更できません。',
      });
      return;
    }

    const executeRoleUpdate = () => {
      const nextM = members.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            role: newRole
          };
        }
        return m;
      });

      setMembers(nextM);
      saveMembers(nextM);
      addAuditLog(
        lang === 'vi' ? 'Thay đổi phân quyền' : 'メンバー権限変更',
        currentMember?.name || 'Unknown',
        currentMember?.email || 'unknown@dymvietnam.net',
        lang === 'vi' 
          ? `Đã thay đổi phân quyền của nhân viên "${target.name}" (${target.email}) từ ${target.role.toUpperCase()} thành ${newRole.toUpperCase()}`
          : `メンバー "${target.name}" (${target.email}) の権限を ${target.role.toUpperCase()} から ${newRole.toUpperCase()} に変更しました`
      );
      setAuditLogs(getStoredAuditLogs());
      if (onMembersChange) {
        onMembersChange(nextM);
      }
      setCustomModal({
        type: 'alert',
        titleVi: 'Cập nhật thành công',
        titleJa: '更新成功',
        messageVi: `Đã cập nhật phân quyền của ${target.name} thành ${newRole.toUpperCase()} thành công!`,
        messageJa: `${target.name}の権限を${newRole.toUpperCase()}に正常に更新しました！`,
      });
    };

    if (target.email.toLowerCase().trim() === currentMember?.email?.toLowerCase().trim()) {
      setCustomModal({
        type: 'confirm',
        titleVi: 'Xác nhận thay đổi quyền bản thân',
        titleJa: '自身の権限変更の確認',
        messageVi: `Bạn đang thực hiện thay đổi quyền của chính tài khoản mình thành "${newRole.toUpperCase()}". Lưu ý nếu hạ cấp có thể bạn sẽ mất quyền truy cập trang quản trị này. Xác nhận thực hiện?`,
        messageJa: `ご自身のアカウント権限を "${newRole.toUpperCase()}" に変更しようとしています。管理者ページへのアクセス権が失われる可能性があります。よろしいですか？`,
        onConfirm: executeRoleUpdate
      });
    } else {
      executeRoleUpdate();
    }
  };

  // Direct department updates
  const handleUpdateMemberDept = (memberId: string, newDept: string) => {
    if (!currentMember || currentMember.role !== 'superadmin') {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể thực hiện',
        titleJa: '操作を実行できません',
        messageVi: 'Chỉ có Super Admin mới thực hiện được hành động này.',
        messageJa: 'この操作は Super Admin のみ実行可能です。',
      });
      return;
    }

    const storedM = getStoredMembers();
    const target = storedM.find(m => m.id === memberId);
    if (!target) return;

    const executeDeptUpdate = () => {
      const nextM = storedM.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            department: newDept
          };
        }
        return m;
      });

      saveMembers(nextM);

      addAuditLog(
        lang === 'vi' ? 'Cập nhật bộ phận' : 'メンバー部署変更',
        currentMember?.name || 'Unknown',
        currentMember?.email || 'unknown@dymvietnam.net',
        lang === 'vi' 
          ? `Đã thay đổi bộ phận của nhân viên "${target.name}" (${target.email}) thành "${newDept}"`
          : `メンバー "${target.name}" (${target.email}) の部署を "${newDept}" に変更しました`
      );
      setAuditLogs(getStoredAuditLogs());

      if (currentMember.role === 'admin') {
        setMembers(nextM.filter(m => m.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim()));
      } else {
        setMembers(nextM);
      }

      if (onMembersChange) {
        onMembersChange(nextM);
      }
      setCustomModal(null);
    };

    setCustomModal({
      type: 'confirm',
      titleVi: 'Xác Nhận Thay Đổi Bộ Phận',
      titleJa: '部署変更の確認',
      messageVi: `Bạn có chắc chắn muốn chuyển nhân sự "${target.name}" sang bộ phận "${newDept}" không?`,
      messageJa: `メンバー "${target.name}" を "${newDept}" 部署へ変更してもよろしいですか？`,
      onConfirm: executeDeptUpdate
    });
  };

  // Remove member completely from database
  const handleDeleteMember = (memberId: string) => {
    if (!currentMember || (currentMember.role !== 'superadmin' && currentMember.role !== 'admin')) {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể thực hiện',
        titleJa: '操作を実行できません',
        messageVi: 'Chỉ có Admin hoặc Super Admin mới thực hiện được hành động này.',
        messageJa: 'この操作は管理者のみ実行可能です。',
      });
      return;
    }
    
    const storedM = getStoredMembers();
    const target = storedM.find(m => m.id === memberId);
    if (!target) return;

    if (target.email.toLowerCase().trim() === currentMember?.email?.toLowerCase().trim()) {
      setCustomModal({
        type: 'alert',
        titleVi: 'Không thể tự xóa',
        titleJa: '自分自身は削除できません',
        messageVi: 'Không thể tự xóa tài khoản của bạn đang đăng nhập!',
        messageJa: '現在ログイン中の自分自身のアカウントは削除できません。',
      });
      return;
    }

    if (currentMember.role === 'admin') {
      const isSameDept = target.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim();
      const isSuper = target.role === 'superadmin';
      
      if (isSuper) {
        setCustomModal({
          type: 'alert',
          titleVi: 'Không thể xóa',
          titleJa: '削除できません',
          messageVi: 'Là Admin, bạn không thể xóa tài khoản Super Admin.',
          messageJa: '管理者権限では、Super Adminアカウントを削除できません。',
        });
        return;
      }
      
      if (!isSameDept) {
        setCustomModal({
          type: 'alert',
          titleVi: 'Không thuộc bộ phận',
          titleJa: '部門が異なります',
          messageVi: 'Là Admin, bạn chỉ có quyền quản lý và xóa những nhân sự thuộc bộ phận của bạn.',
          messageJa: '管理者権限では、ご自身の所属部門のメンバーのみ削除可能です。',
        });
        return;
      }
    }

    setCustomModal({
      type: 'confirm',
      titleVi: 'Xác Nhận Xóa Nhân Sự',
      titleJa: 'メンバーアカウント削除確認',
      messageVi: `Bạn có chắc chắn muốn xóa nhân sự "${target.name}" (${target.email}) khỏi hệ thống không?`,
      messageJa: `メンバー "${target.name}" (${target.email}) を完全に削除してもよろしいですか？`,
      onConfirm: () => {
        const nextM = storedM.filter(m => m.id !== memberId);
        saveMembers(nextM);
        addAuditLog(
          lang === 'vi' ? 'Xóa nhân viên' : 'メンバー削除',
          currentMember?.name || 'Unknown',
          currentMember?.email || 'unknown@dymvietnam.net',
          lang === 'vi' 
            ? `Đã xóa nhân viên: "${target.name}" (${target.email})`
            : `メンバー "${target.name}" (${target.email}) を削除しました`
        );
        setAuditLogs(getStoredAuditLogs());
        
        if (currentMember.role === 'admin') {
          setMembers(nextM.filter(m => m.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim()));
        } else {
          setMembers(nextM);
        }

        if (onMembersChange) {
          onMembersChange(nextM);
        }
        setCustomModal(null);
      }
    });
  };

  // Calculate Overview Stats
  const scoreArray = submissions.map(s => (s.score / s.maxScore) * 10);
  const averageScoreValue = scoreArray.length > 0 
    ? (scoreArray.reduce((acc, val) => acc + val, 0) / scoreArray.length).toFixed(1)
    : '0.0';

  // Filters logic for Submissions list (Requirement 6)
  const filteredSubmissions = submissions.filter((sub) => {
    const textMatch = 
      sub.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      sub.employeeEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const examMatch = selectedExamFilter === 'all' || sub.examId === selectedExamFilter;
    
    // Dept filtering
    const subMember = members.find(m => m.email.toLowerCase().trim() === sub.employeeEmail?.toLowerCase().trim());
    const deptMatch = selectedDeptFilter === 'all' || 
      (subMember && subMember.department === selectedDeptFilter) ||
      (sub.employeeDepartment && sub.employeeDepartment === selectedDeptFilter);

    // Team filtering
    const teamMatch = selectedTeamFilter === 'all' ||
      (selectedTeamFilter === 'none' && !subMember?.team && !sub.employeeTeam) ||
      (subMember && subMember.team && subMember.team.toLowerCase().trim() === selectedTeamFilter.toLowerCase().trim()) ||
      (sub.employeeTeam && sub.employeeTeam.toLowerCase().trim() === selectedTeamFilter.toLowerCase().trim());

    // Score filtering
    let scoreMatch = true;
    const accuracy = (sub.score / (sub.maxScore || 1)) * 100;
    if (selectedScoreFilter === 'perfect') {
      scoreMatch = sub.score === sub.maxScore && sub.maxScore > 0;
    } else if (selectedScoreFilter === 'passed') {
      scoreMatch = accuracy >= 80;
    } else if (selectedScoreFilter === 'passable') {
      scoreMatch = accuracy >= 50 && accuracy < 80;
    } else if (selectedScoreFilter === 'failed') {
      scoreMatch = accuracy < 50;
    }

    // Date filtering (Requirement 6)
    const dateMatch = !submissionsDateFilter || 
      (sub.submittedAt && sub.submittedAt.startsWith(submissionsDateFilter));

    return textMatch && examMatch && deptMatch && teamMatch && scoreMatch && dateMatch;
  });

  const uniqueDepartments = departmentsList;

  const formatDateTimeVietnamese = (isoString: string) => {
    return formatInVietnamTime(isoString);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans text-slate-800" id="admin-panel-viewport">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
        <div>
          <button
            onClick={onBackToPortal}
            className="group inline-flex items-center gap-1 text-xs text-[#5A5A40] hover:text-[#1A1A1A] font-bold mb-2 cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" /> 
            {lang === 'vi' ? 'Quay lại Cổng Nhân Viên' : '受検ポータルに戻る'}
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 font-serif tracking-tight">{t.adminTitle}</h1>
            <span className="bg-[#5A5A40] text-emerald-100 border border-emerald-500 shadow-xs uppercase text-[9px] font-bold px-2.5 py-0.5 rounded-md">
              {currentMember?.role === 'superadmin' ? 'SUPER ADMIN MODE' : 'ADMIN MODE'}
            </span>
          </div>
          {t.adminSubTitle && (
            <p className="text-slate-500 text-xs mt-1">
              {t.adminSubTitle}
            </p>
          )}
        </div>


      </div>

      {editingExamId === null ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* STATS WIDGETS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="overview-stats-grid">
            
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider block uppercase">{t.totalExams}</span>
              <span className="text-2xl font-black text-[#5A5A40] block mt-1 font-serif italic">{exams.length}</span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider block uppercase">{t.totalSubmissions}</span>
              <span className="text-2xl font-black text-[#5A5A40] block mt-1 font-serif italic">{submissions.length}</span>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider block uppercase">{t.activeMembers}</span>
              <span className="text-2xl font-black text-[#5A5A40] block mt-1 font-serif italic">{members.length}</span>
            </div>

          </div>

          {/* INNER TAB SHIFT BUTTONS */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('exams')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'exams' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              id="tab-exams"
            >
              {t.tabExams} ({exams.length})
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'submissions' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              id="tab-submissions"
            >
              {t.tabSubmissions} ({submissions.length})
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'dashboard' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              id="tab-dashboard"
            >
              📊 {lang === 'vi' ? 'Dashboard Tiến Độ' : '進捗ダッシュボード'}
            </button>
            {(currentMember?.role === 'superadmin' || currentMember?.role === 'admin') && (
              <button
                onClick={() => setActiveTab('members')}
                className={`px-5 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'members' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                id="tab-members"
              >
                {t.tabMembers} ({members.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'audit' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              id="tab-audit-logs"
            >
              📋 {lang === 'vi' ? 'Lịch sử hệ thống' : 'システム活動ログ'}
            </button>
          </div>

          {/* TAB CONTENT: EXAMS MANAGER */}
          {activeTab === 'exams' && (() => {
            const isSuperAdmin = currentMember?.role === 'superadmin';
            const adminDept = currentMember?.department || '';

            const filteredExams = exams
              .filter(ex => {
                // 1. Role department visibility: admin only sees their own department's exams
                if (!isSuperAdmin) {
                  if (!ex.department || ex.department.toLowerCase().trim() !== adminDept.toLowerCase().trim()) {
                    return false;
                  }
                } else {
                  // Superadmin filters by examsDeptFilter
                  const deptMatch = examsDeptFilter === 'all' || 
                    (ex.department && ex.department.toLowerCase().trim() === examsDeptFilter.toLowerCase().trim());
                  if (!deptMatch) return false;
                }

                // Team filter matching
                if (examsTeamFilter !== 'all') {
                  if (examsTeamFilter === 'none') {
                    if (ex.team) return false;
                  } else {
                    if (!ex.team || ex.team.toLowerCase().trim() !== examsTeamFilter.toLowerCase().trim()) return false;
                  }
                }

                // 2. Strict Date filter: only match ex.startTime, ignore createdAt to avoid date mismatch bug!
                const dateMatch = !examsDateFilter || 
                  (ex.startTime && ex.startTime.startsWith(examsDateFilter));

                return dateMatch;
              })
              .sort((a, b) => {
                const timeA = parseAsVietnamTime(a.createdAt || a.startTime || '0').getTime();
                const timeB = parseAsVietnamTime(b.createdAt || b.startTime || '0').getTime();
                return timeB - timeA; // Display newest first
              });

            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6" id="exams-tab-content">
                {/* Filter Toolbar for Exams (Requirement 5 & 8) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Department Filter Selector - Only show for Super Admin */}
                    {isSuperAdmin ? (
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                          {lang === 'vi' ? 'Bộ Phận:' : '対象部署:'}
                        </label>
                        <select
                          value={examsDeptFilter}
                          onChange={(e) => setExamsDeptFilter(e.target.value)}
                          className="bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#5A5A40]"
                        >
                          <option value="all">{lang === 'vi' ? '--- Tất cả bộ phận ---' : '--- すべての部署 ---'}</option>
                          {uniqueDepartments.map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                          {lang === 'vi' ? 'Bộ Phận Của Bạn:' : '所属部署:'}
                        </label>
                        <div className="bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-3 py-1.5 text-xs font-black text-[#5A5A40] uppercase select-none">
                          {adminDept}
                        </div>
                      </div>
                    )}

                    {/* Team Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                        {lang === 'vi' ? 'Nhánh Team:' : 'チーム:'}
                      </label>
                      <select
                        value={examsTeamFilter}
                        onChange={(e) => setExamsTeamFilter(e.target.value)}
                        className="bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#5A5A40] cursor-pointer"
                      >
                        <option value="all">{lang === 'vi' ? '--- Tất cả Team ---' : '--- すべてのチーム ---'}</option>
                        <option value="none">{lang === 'vi' ? 'Chưa phân Team' : 'チーム未分類'}</option>
                        {(() => {
                          const activeDept = isSuperAdmin ? examsDeptFilter : adminDept;
                          if (activeDept === 'all') {
                            const allTeams = Object.values(deptTeams).flat();
                            const uniqueTeams = Array.from(new Set(allTeams));
                            return uniqueTeams.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ));
                          } else {
                            const list = deptTeams[activeDept] || [];
                            return list.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ));
                          }
                        })()}
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                        {lang === 'vi' ? 'Ngày Diễn Ra:' : '開催日:'}
                      </label>
                      <input
                        type="date"
                        value={examsDateFilter}
                        onChange={(e) => setExamsDateFilter(e.target.value)}
                        className="bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#5A5A40]"
                      />
                    </div>

                    {/* Reset Filters Button */}
                    {((isSuperAdmin && examsDeptFilter !== 'all') || examsTeamFilter !== 'all' || examsDateFilter !== '') && (
                      <button
                        onClick={() => {
                          setExamsDeptFilter('all');
                          setExamsTeamFilter('all');
                          setExamsDateFilter('');
                        }}
                        className="mt-4 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                      >
                        {lang === 'vi' ? 'Xoá lọc' : 'クリア'}
                      </button>
                    )}
                  </div>

                  {/* Create New Task Button INSIDE Exam Papers block (Requirement 8) */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => startEditExam('new')}
                      className="px-4 py-2 bg-[#5A5A40] hover:bg-[#4D4D36] text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                      id="inner-btn-trigger-builder-new"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {lang === 'vi' ? 'Tạo Đề Thi Mới' : '新規試験を作成'}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredExams.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      {lang === 'vi' ? 'Không có đề thi nào phù hợp với bộ lọc.' : '該当する試験データがありません。'}
                    </div>
                  ) : (
                    filteredExams.map((ex) => {
                      const totalPoints = ex.questions.reduce((a, b) => a + b.points, 0);
                      return (
                        <div key={ex.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <h4 className="font-bold text-slate-800 text-sm font-serif">{ex.title}</h4>
                              <span className="bg-[#D4A373]/10 text-[#5A5A40] border border-[#D4A373]/25 text-[9px] uppercase font-bold px-2 py-0.5 rounded">
                                🎯 Dept: {ex.department || 'All'}
                              </span>
                              {ex.team && (
                                <span className="bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/25 text-[9px] uppercase font-bold px-2 py-0.5 rounded">
                                  📁 Team: {ex.team}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] line-clamp-1">{ex.description || 'No description provided'}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-2 font-medium">
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-[#D4A373]" /> {ex.duration} {t.minutes}</span>
                              <span>{t.totalQuestions}: <strong>{ex.questions.length}</strong></span>
                              <span>{lang === 'vi' ? 'Tổng điểm:' : '設問満点:'} <strong>{totalPoints}</strong> {t.points}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 text-[10px] text-[#5A5A40] font-bold pt-1.5">
                              <span>{t.startTime}: {formatDateTimeVietnamese(ex.startTime)}</span>
                              <span>{t.endTime}: {formatDateTimeVietnamese(ex.endTime)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {checkCanManageExam(ex) ? (
                              <>
                                <button
                                  onClick={() => startEditExam(ex)}
                                  className="bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-lg text-[#5A5A40] hover:text-black transition cursor-pointer"
                                  title={t.btnEditExam}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExam(ex.id)}
                                  className="bg-white hover:bg-red-50 border border-slate-200 p-2 rounded-lg text-rose-600 hover:text-rose-800 transition cursor-pointer"
                                  title={t.btnDeleteExam}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 border border-slate-200 px-2 py-1 rounded select-none">
                                {lang === 'vi' ? 'Xem duy nhất (chỉ đọc)' : '閲覧専用 (他作成者)'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB CONTENT: SUBMISSIONS LIST */}
          {activeTab === 'submissions' && (
            <div className="space-y-4" id="submissions-tab-content">
              
              {/* SEARCH FILTER HEADERS & DATE OF EXAMS / SYNC OPTIONS */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col md:flex-row gap-3 items-end">
                <div className="grow w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Tìm kiếm nhân viên' : '社員検索'}</label>
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-[#5A5A40] font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{t.tabExams}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                    value={selectedExamFilter}
                    onChange={(e) => setSelectedExamFilter(e.target.value)}
                  >
                    <option value="all">{t.allExams}</option>
                    {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{t.employeeDept}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    value={selectedDeptFilter}
                    disabled={currentMember?.role === 'admin'}
                    onChange={(e) => {
                      setSelectedDeptFilter(e.target.value);
                      setSelectedTeamFilter('all'); // Reset team filter when department changes
                    }}
                  >
                    {currentMember?.role === 'admin' ? (
                      <option value={currentMember.department}>{currentMember.department} ({lang === 'vi' ? 'Phòng ban của bạn' : '担当チーム'})</option>
                    ) : (
                      <>
                        <option value="all">{t.allDepts}</option>
                        {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </>
                    )}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Nhánh Team' : '所属チーム'}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                    value={selectedTeamFilter}
                    onChange={(e) => setSelectedTeamFilter(e.target.value)}
                  >
                    <option value="all">{lang === 'vi' ? 'Tất cả Team' : 'すべてのチーム'}</option>
                    <option value="none">{lang === 'vi' ? 'Chưa phân Team' : 'チーム未分類'}</option>
                    {(() => {
                      const activeDept = currentMember?.role === 'admin' ? currentMember.department : selectedDeptFilter;
                      if (activeDept === 'all') {
                        const allTeams = Object.values(deptTeams).flat();
                        const uniqueTeams = Array.from(new Set(allTeams));
                        return uniqueTeams.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ));
                      } else {
                        const list = deptTeams[activeDept] || [];
                        return list.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ));
                      }
                    })()}
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Lọc Điểm số' : '得点フィルター'}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                    value={selectedScoreFilter}
                    onChange={(e) => setSelectedScoreFilter(e.target.value)}
                  >
                    <option value="all">{lang === 'vi' ? 'Tất cả điểm số' : 'すべての得点'}</option>
                    <option value="perfect">{lang === 'vi' ? 'Điểm tuyệt đối (100%)' : '満点 (100%)'}</option>
                    <option value="passed">{lang === 'vi' ? 'Đạt yêu cầu (>= 80%)' : '合格水準 (>= 80%)'}</option>
                    <option value="passable">{lang === 'vi' ? 'Khá/Trung bình (>= 50% đến < 80%)' : '平均水準 (50%〜80%)'}</option>
                    <option value="failed">{lang === 'vi' ? 'Yếu / Chưa đạt (< 50%)' : '再試験対象 (< 50%)'}</option>
                  </select>
                </div>

                {/* Submissions Date Filter (Requirement 6) */}
                <div className="w-full md:w-48">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Ngày Thi' : '受検日'}</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                    value={submissionsDateFilter}
                    onChange={(e) => setSubmissionsDateFilter(e.target.value)}
                  />
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  <button
                    onClick={handleSyncAll}
                    disabled={syncingAll}
                    className="w-full px-4 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:bg-slate-200 cursor-pointer flex items-center justify-center gap-1.5 transition whitespace-nowrap shadow-xs"
                    title="Export CSV and sync with Google Sheets (Requirement 6)"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                    {lang === 'vi' ? 'Xuất CSV & Đồng bộ Sheet' : 'CSV出力 & Googleシート同期'}
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto p-4">
                {filteredSubmissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium">
                    {lang === 'vi' ? 'Không khớp kết quả bài thi nào' : '条件に合致する受験記録が見つかりません。'}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                        <th className="py-3 px-2">{t.employeeName}</th>
                        <th className="py-3 px-2">{t.employeeDept}</th>
                        <th className="py-3 px-2">{t.tabExams}</th>
                        <th className="py-3 px-2 text-center">{t.scoreLabel}</th>
                        <th className="py-3 px-2 text-center">{lang === 'vi' ? 'Thời gian làm bài' : '受検時間'}</th>
                        <th className="py-3 px-2 text-right">{t.submittedAt}</th>
                        <th className="py-3 px-2 text-right">{lang === 'vi' ? 'Tính năng' : '操作'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubmissions.map((sub) => {
                        const m = members.find(u => u.email.toLowerCase() === sub.employeeEmail.toLowerCase());
                        const userDept = m?.department || sub.employeeDepartment || 'N/A';
                        const rate = Math.round((sub.score / sub.maxScore) * 100) || 0;

                        return (
                          <tr key={sub.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition font-medium">
                            <td className="py-3 px-2 text-slate-900">
                              <span className="font-extrabold block">{sub.employeeName}</span>
                              <span className="text-[10px] text-slate-400">{sub.employeeEmail}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold block mb-1 w-max">
                                {userDept}
                              </span>
                              {(m?.team || sub.employeeTeam) && (
                                <span className="bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/15 px-2 py-0.5 rounded text-[10px] font-bold block w-max">
                                  📁 {m?.team || sub.employeeTeam}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 font-semibold text-slate-700 max-w-[150px] truncate">{sub.examTitle}</td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-extrabold text-[#5A5A40] text-sm block">{sub.score} / {sub.maxScore}</span>
                              <span className="text-[9px] text-[#D4A373] font-bold">{rate}% đạt</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-mono bg-slate-150 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold">
                                {sub.timeTakenSeconds ? (
                                  lang === 'vi' 
                                    ? `${Math.floor(sub.timeTakenSeconds / 60)}p ${sub.timeTakenSeconds % 60}s` 
                                    : `${Math.floor(sub.timeTakenSeconds / 60)}分 ${sub.timeTakenSeconds % 60}秒`
                                ) : (
                                  lang === 'vi' ? 'Dưới 1 phút' : '1分未満'
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-slate-400 text-[10px]">{formatDateTimeVietnamese(sub.submittedAt)}</td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedSubmission(sub)}
                                  className="px-2 py-1 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-[#5A5A40] rounded transition flex items-center gap-0.5 cursor-pointer"
                                  title="Chi Tiết"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {lang === 'vi' ? 'Xem' : '閲覧'}
                                </button>
                                <button
                                  onClick={() => handleSyncToSheets(sub)}
                                  disabled={syncingId === sub.id}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                >
                                  <CloudLightning className="w-3.5 h-3.5 shrink-0" />
                                  {syncingId === sub.id ? '...' : (lang === 'vi' ? 'Sheet' : '同期')}
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmission(sub)}
                                  className="px-2 py-1 bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] hover:bg-[#FFE4E6] rounded text-[#E11D48] text-xs font-bold transition cursor-pointer flex items-center gap-0.5"
                                  title={lang === 'vi' ? 'Xóa kết quả bài thi này để cho phép làm lại' : '再受験させるためにこの受験結果を削除します'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {lang === 'vi' ? 'Xóa' : '削除'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Google Sheets URL Setting Dynamic Panel (Requirement 6 - Moved to Bottom for Easier Filtering) */}
              <div className="bg-[#FAF9F5] border border-[#EBE8DF] rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="space-y-1 grow">
                  <h4 className="text-xs font-extrabold text-[#1A1A1A] flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#5A5A40]" />
                    {lang === 'vi' ? 'Cấu Hình Đường Dẫn Google Sheets' : 'Googleスプレッドシート連携 (URL設定)'}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {lang === 'vi' 
                      ? 'Nhập deploy Web App URL của Apps Script để hệ thống có thể kết nối gửi bảng điểm trực tuyến khi đồng bộ.' 
                      : 'Google Sheetsと通信するためのGoogle Apps Script Web App URLを指定します。'}
                  </p>
                  <input
                    type="text"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#5A5A40] font-mono font-medium"
                  />
                </div>
                <div className="shrink-0 flex items-center justify-end">
                  <button
                    onClick={() => {
                      saveSheetsUrl(sheetsUrl);
                      addAuditLog(
                        lang === 'vi' ? 'Cấu hình Google Sheets' : 'Google Sheets設定',
                        currentMember?.name || 'Unknown',
                        currentMember?.email || 'unknown@dymvietnam.net',
                        lang === 'vi' 
                          ? `Đã cập nhật Web App URL kết nối Google Sheets: "${sheetsUrl || 'Đã xóa URL'}"`
                          : `Google Sheets連携のWeb App URLを更新しました: "${sheetsUrl || 'URLの削除'}"`
                      );
                      setAuditLogs(getStoredAuditLogs());
                      alert(lang === 'vi' ? 'Đã lưu cấu hình Google Sheets của bạn!' : '設定を正常に保存しました！');
                    }}
                    className="px-4 py-2.5 bg-[#5A5A40] text-white hover:bg-[#4D4D36] rounded-xl text-xs font-bold shadow-xs transition duration-150 cursor-pointer whitespace-nowrap"
                  >
                    {lang === 'vi' ? 'Lưu cấu hình' : '設定を保存'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: MEMBERS & ROLES & DEPT ACCESS MANAGER */}
          {activeTab === 'members' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="members-tab-content">
              
              {/* CỘT 1 (LEFT COLUMN): QUẢN LÝ PHÒNG BAN & BỘ LỌC BỘ PHẬN */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-6 lg:col-span-1">
                {/* 1. Tạo thêm phòng ban/tên team theo từng phòng ban */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-[#5A5A40] text-sm font-serif">
                       {lang === 'vi' ? 'Phòng Ban / Đội Nhóm' : '部署・チーム追加'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {lang === 'vi' ? 'Thêm mới phòng ban hoặc đội nhóm nghiệp vụ.' : '共通部署・チームマスターの登録と管理。'}
                    </p>
                  </div>

                  {currentMember?.role === 'superadmin' ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder={lang === 'vi' ? "Tên bộ phận mới..." : "新部署名を入力..."}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-[#5A5A40] font-bold"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newDeptName.trim()) return;
                            const term = newDeptName.trim();
                            if (departmentsList.includes(term)) {
                              alert(lang === 'vi' ? 'Bộ phận này đã tồn tại trong danh sách!' : 'この部署はすでに登録されています。');
                              return;
                            }
                            const updated = [...departmentsList, term];
                            setDepartmentsList(updated);
                            saveDepartments(updated);
                            addAuditLog(
                              lang === 'vi' ? 'Thêm bộ phận' : '部署追加',
                              currentMember?.name || 'Unknown',
                              currentMember?.email || 'unknown@dymvietnam.net',
                              lang === 'vi' 
                                ? `Đã thêm bộ phận nghiệp vụ mới: "${term}"`
                                : `新規部署 "${term}" を追加しました`
                            );
                            setAuditLogs(getStoredAuditLogs());
                            setNewDeptName('');
                            setNewMemberDept(term);
                          }}
                          className="bg-[#5A5A40] hover:bg-[#4D4D36] text-white px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          {lang === 'vi' ? 'Thêm' : '追加'}
                        </button>
                      </div>

                      {/* Display departments list */}
                      <div className="space-y-1 max-h-[160px] overflow-y-auto">
                        {departmentsList.map((dept) => (
                          <div key={dept} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 text-xs font-bold text-slate-600">
                            <span>{dept}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (departmentsList.length <= 1) {
                                  alert(lang === 'vi' ? 'Phải duy trì tối thiểu 1 phòng ban.' : '最低限1つの部署が必要です。');
                                  return;
                                }
                                setCustomModal({
                                  type: 'confirm',
                                  titleVi: 'Xác Nhận Xóa Phòng Ban',
                                  titleJa: '部署削除確認',
                                  messageVi: `Bạn chắc chắn muốn xóa "${dept}"?`,
                                  messageJa: `本当に "${dept}" を削除しますか？`,
                                  onConfirm: () => {
                                    const updated = departmentsList.filter(d => d !== dept);
                                    setDepartmentsList(updated);
                                    saveDepartments(updated);
                                    addAuditLog(
                                      lang === 'vi' ? 'Xóa bộ phận' : '部署削除',
                                      currentMember?.name || 'Unknown',
                                      currentMember?.email || 'unknown@dymvietnam.net',
                                      lang === 'vi' 
                                        ? `Đã xóa bộ phận: "${dept}"`
                                        : `部署 "${dept}" を削除しました`
                                    );
                                    setAuditLogs(getStoredAuditLogs());
                                    setCustomModal(null);
                                  }
                                });
                              }}
                              className="text-slate-400 hover:text-rose-600 transition p-0.5 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-800 text-[11px] font-bold">
                        {lang === 'vi' 
                          ? '⚠️ Chỉ Super Admin mới có quyền thêm/bớt phòng ban hệ thống.' 
                          : '⚠️ 部署の追加・削除は Super Admin のみ可能です。'}
                      </div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto">
                        {departmentsList.map((dept) => (
                          <div key={dept} className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded px-2.5 py-1.5 text-xs text-slate-400 font-bold select-none">
                            <span>{dept}</span>
                            <span className="text-[9px] text-slate-300 font-mono tracking-wider uppercase">
                              {lang === 'vi' ? 'Chỉ Đọc' : 'READONLY'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 1b. Tạo thêm nhánh team cho từng bộ phận */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="pb-1">
                    <h3 className="font-bold text-[#5A5A40] text-sm font-serif flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      {lang === 'vi' ? 'Nhánh Team Bộ Phận' : '部門内チームの管理'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {lang === 'vi' ? 'Quản lý các nhóm nhỏ, tổ, hoặc nhóm nghiệp vụ trực thuộc từng bộ phận.' : '所属部署配下のグループ・チーム（開発部・営業課など）を追加・削除可能です。'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Choose department for Team if Superadmin */}
                    {currentMember?.role === 'superadmin' ? (
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Chọn Bộ Phận' : '対象の部署'}</label>
                        <select
                          value={newTeamDept}
                          onChange={(e) => {
                            setNewTeamDept(e.target.value);
                          }}
                          className="w-full bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none"
                        >
                          {departmentsList.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">{lang === 'vi' ? 'Bộ Phận Của Bạn' : '所属部署'}</label>
                        <div className="bg-[#FAF9F5] border border-[#E2DFD3] rounded-lg px-3 py-1.5 text-xs font-bold text-[#5A5A40] select-none uppercase">
                          {currentMember?.department}
                        </div>
                      </div>
                    )}

                    {/* New team input and Add */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={lang === 'vi' ? "Tên team mới..." : "新チーム・課の名前を入力..."}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTeamName.trim()) return;
                          const dept = currentMember?.role === 'admin' ? (currentMember.department || '') : newTeamDept;
                          if (!dept) return;

                          const currentTeams = { ...deptTeams };
                          const existingList = currentTeams[dept] || [];
                          const cleanTeam = newTeamName.trim();
                          if (existingList.map(t => t.toLowerCase().trim()).includes(cleanTeam.toLowerCase().trim())) {
                            alert(lang === 'vi' ? 'Team này đã tồn tại trong bộ phận!' : 'このチーム名はすでに登録されています。');
                            return;
                          }

                          const nextList = [...existingList, cleanTeam];
                          currentTeams[dept] = nextList;
                          setDeptTeams(currentTeams);
                          saveStoredTeams(currentTeams);
                          addAuditLog(
                            lang === 'vi' ? 'Thêm team bộ phận' : '部門チーム追加',
                            currentMember?.name || 'Unknown',
                            currentMember?.email || 'unknown@dymvietnam.net',
                            lang === 'vi' 
                              ? `Đã thêm nhóm mới: "${cleanTeam}" trực thuộc bộ phận "${dept}"`
                              : `"${dept}" 部署配下に新規チーム "${cleanTeam}" を追加しました`
                          );
                          setAuditLogs(getStoredAuditLogs());
                          setNewTeamName('');
                          alert(lang === 'vi' ? `Đã thêm team "${cleanTeam}" thành công!` : `チーム "${cleanTeam}" が追加されました。`);
                        }}
                        className="bg-[#5A5A40] hover:bg-[#4D4D36] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        {lang === 'vi' ? 'Thêm' : '追加'}
                      </button>
                    </div>

                    {/* Render existing teams list for the selected/your department */}
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                        {lang === 'vi' 
                          ? `Danh sách team thuộc [${currentMember?.role === 'admin' ? (currentMember?.department || '') : newTeamDept}]`
                          : `[${currentMember?.role === 'admin' ? (currentMember?.department || '') : newTeamDept}] のチーム一覧`}
                      </label>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                        {(() => {
                          const dept = currentMember?.role === 'admin' ? (currentMember?.department || '') : newTeamDept;
                          const list = deptTeams[dept] || [];
                          if (list.length === 0) {
                            return <div className="text-[10px] text-slate-400 text-center py-2">{lang === 'vi' ? 'Chưa cấu hình team nào.' : '登録チームがありません'}</div>;
                          }
                          return list.map((team) => (
                            <div key={team} className="flex items-center justify-between bg-white border border-slate-150 rounded px-2 py-1.5 text-[11px] font-bold text-slate-600">
                              <span>📁 {team}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomModal({
                                    type: 'confirm',
                                    titleVi: 'Xác Nhận Xóa Team',
                                    titleJa: 'チーム削除確認',
                                    messageVi: `Bạn chắc chắn muốn xóa team "${team}" khỏi bộ phận này không?`,
                                    messageJa: `このチーム "${team}" を削除してもよろしいですか？`,
                                    onConfirm: () => {
                                      const currentTeams = { ...deptTeams };
                                      const list = currentTeams[dept] || [];
                                      const nextList = list.filter(t => t !== team);
                                      currentTeams[dept] = nextList;
                                      setDeptTeams(currentTeams);
                                      saveStoredTeams(currentTeams);
                                      setCustomModal(null);
                                    }
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
                                title="Xóa team"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Bộ lọc Bộ phận */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide font-sans">
                      {lang === 'vi' ? 'Xem theo bộ phận' : '部門フィルター'}
                    </h4>
                    {currentMember?.role === 'superadmin' ? (
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMemberListDeptFilter('all');
                            setMemberListTeamFilter('all');
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                            memberListDeptFilter === 'all'
                              ? 'bg-[#5A5A40] text-white shadow-xs'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{lang === 'vi' ? 'Tất cả phòng ban' : '全部門'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                            memberListDeptFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {getStoredMembers().length}
                          </span>
                        </button>

                        {departmentsList.map(dept => {
                          const count = getStoredMembers().filter(m => m.department.toLowerCase().trim() === dept.toLowerCase().trim()).length;
                          return (
                            <button
                              type="button"
                              key={dept}
                              onClick={() => {
                                setMemberListDeptFilter(dept);
                                setMemberListTeamFilter('all');
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                                memberListDeptFilter === dept
                                  ? 'bg-[#5A5A40] text-white shadow-xs'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">{dept}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] shrink-0 ${
                                memberListDeptFilter === dept ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 text-[11px] font-bold">
                          {lang === 'vi' 
                            ? `Hệ thống tự động khóa hiển thị nhân viên thuộc Bộ phận của bạn (${currentMember?.department}).` 
                            : `所属部署 (${currentMember?.department}) のメンバーのみ閲覧可能です。`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2b. Bộ lọc Nhánh Team */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide font-sans">
                      {lang === 'vi' ? 'Lọc theo nhánh Team' : '所属チームで絞り込み'}
                    </h4>
                    <div className="space-y-1">
                      {/* Option: all teams */}
                      <button
                        type="button"
                        onClick={() => setMemberListTeamFilter('all')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                          memberListTeamFilter === 'all'
                            ? 'bg-[#5A5A40] text-white shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{lang === 'vi' ? 'Tất cả Team' : 'すべてのチーム'}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                          memberListTeamFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {(() => {
                            const dept = currentMember?.role === 'admin' ? (currentMember?.department || '') : memberListDeptFilter;
                            return getStoredMembers().filter(m => {
                              return dept === 'all' || m.department.toLowerCase().trim() === dept.toLowerCase().trim();
                            }).length;
                          })()}
                        </span>
                      </button>

                      {/* Dynamic teams render */}
                      {(() => {
                        const dept = currentMember?.role === 'admin' ? (currentMember?.department || '') : memberListDeptFilter;
                        const list = deptTeams[dept] || [];
                        return list.map(tName => {
                          const count = getStoredMembers().filter(m => {
                            const dMatch = dept === 'all' || m.department.toLowerCase().trim() === dept.toLowerCase().trim();
                            const tMatch = m.team && m.team.toLowerCase().trim() === tName.toLowerCase().trim();
                            return dMatch && tMatch;
                          }).length;

                          return (
                            <button
                              type="button"
                              key={tName}
                              onClick={() => setMemberListTeamFilter(tName)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                                memberListTeamFilter === tName
                                  ? 'bg-[#5A5A40] text-white shadow-xs'
                                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span className="truncate">📂 {tName}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] shrink-0 ${
                                memberListTeamFilter === tName ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        });
                      })()}

                      {/* Not assigned team filter */}
                      {(() => {
                        const dept = currentMember?.role === 'admin' ? (currentMember?.department || '') : memberListDeptFilter;
                        const noTeamCount = getStoredMembers().filter(m => {
                          const dMatch = dept === 'all' || m.department.toLowerCase().trim() === dept.toLowerCase().trim();
                          return dMatch && !m.team;
                        }).length;

                        if (noTeamCount > 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => setMemberListTeamFilter('none')}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                                  memberListTeamFilter === 'none'
                                    ? 'bg-[#5A5A40] text-white shadow-xs'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>{lang === 'vi' ? 'Chưa phân Team' : 'チーム未分類'}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] shrink-0 ${
                                memberListTeamFilter === 'none' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {noTeamCount}
                              </span>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

              {/* CỘT 2 (RIGHT COLUMN): DANH SÁCH NHÂN VIÊN & NÚT BẤM ĐĂNG KÝ BẰNG MODAL */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm font-serif">
                      {lang === 'vi' ? 'Danh sách nhân viên' : 'メンバー一覧'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {currentMember?.role === 'admin' 
                        ? (lang === 'vi' ? `Bạn chỉ có thể xem nhân viên thuộc bộ phận ${currentMember.department}` : `所属部署 (${currentMember.department}) のメンバーのみ表示中`)
                        : (lang === 'vi' ? 'Xem tổng quan tất cả nhân sự và hỗ trợ điều chỉnh cấp độ phân quyền.' : 'スーパー管理者による会社全体のメンバー権限調整。')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* NÚT BẤM ĐĂNG KÍ NHÂN VIÊN RIÊNG */}
                    <button
                      onClick={() => {
                        // Reset forms
                        setNewMemberName('');
                        setNewMemberEmail('');
                        if (currentMember?.role === 'admin') {
                          setNewMemberDept(currentMember.department);
                          setNewMemberRole('member');
                        } else {
                          setNewMemberDept(departmentsList[0] || '');
                          setNewMemberRole('member');
                        }
                        setShowAddMemberModal(true);
                      }}
                      className="bg-[#5A5A40] hover:bg-[#4D4D36] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {lang === 'vi' ? 'Đăng ký nhân viên' : '社員登録'}
                    </button>
                  </div>
                </div>

                {/* SEARCH BAR FOR EMPLOYEES */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder={lang === 'vi' ? 'Nhập tên hoặc email cần tìm kiếm...' : '名前、メールアドレスで検索...'}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-[#5A5A40] focus:bg-white text-slate-800 transition font-bold"
                  />
                  {searchMemberQuery && (
                    <button
                      onClick={() => setSearchMemberQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 font-bold transition text-xs"
                    >
                      {lang === 'vi' ? 'Xóa lọc' : 'クリア'}
                    </button>
                  )}
                </div>

                {/* LIST EMPLOYEES CONTAINER */}
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {(() => {
                    const getRoleWeight = (role: string): number => {
                      if (role === 'superadmin') return 100;
                      if (role === 'admin') return 50;
                      return 10;
                    };

                    const storedAll = getStoredMembers();

                    // 1. Role-based Scope filter (Admin only sees own dept, Superadmin sees filtered or all)
                    let baseList = [...storedAll];
                    if (currentMember?.role === 'admin') {
                      baseList = baseList.filter(m => m.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim());
                    } else if (currentMember?.role === 'superadmin') {
                      if (memberListDeptFilter !== 'all') {
                        baseList = baseList.filter(m => m.department === memberListDeptFilter);
                      }
                    }

                    // 1b. Apply Team Filter
                    if (memberListTeamFilter !== 'all') {
                      if (memberListTeamFilter === 'none') {
                        baseList = baseList.filter(m => !m.team);
                      } else {
                        baseList = baseList.filter(m => m.team && m.team.toLowerCase().trim() === memberListTeamFilter.toLowerCase().trim());
                      }
                    }

                    // 2. Search query filter
                    const filteredAndSortedMembers = baseList.filter(m => {
                      if (!searchMemberQuery.trim()) return true;
                      const q = searchMemberQuery.toLowerCase().trim();
                      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
                    }).sort((a, b) => {
                      const wa = getRoleWeight(a.role);
                      const wb = getRoleWeight(b.role);
                      if (wb !== wa) return wb - wa;
                      return a.name.localeCompare(b.name, 'vi');
                    });

                    if (filteredAndSortedMembers.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          {lang === 'vi' ? 'Không tìm thấy nhân viên nào trùng khớp.' : '社員が見つかりません。'}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2.5">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                          <span>{lang === 'vi' ? 'NHÂN VIÊN ĐANG HIỂN THỊ' : '表示中メンバー'}</span>
                          <span>{filteredAndSortedMembers.length} {lang === 'vi' ? 'nhân viên' : '名'}</span>
                        </div>
                        
                        {filteredAndSortedMembers.map((m) => {
                          const isSelf = m.email.toLowerCase().trim() === currentMember?.email?.toLowerCase().trim();
                          const isSuper = m.role === 'superadmin';
                          const isAdmin = m.role === 'admin';
                          
                          // Super admin can delete anyone but themselves. 
                          // Admin can delete members in their department who are NOT superadmin/admin.
                          const canDeleteMember = currentMember?.role === 'superadmin' 
                            ? !isSelf 
                            : (currentMember?.role === 'admin' && m.role === 'member');
                            
                          const canChangeMemberRole = currentMember?.role === 'superadmin';
                          const canChangeMemberDept = currentMember?.role === 'superadmin';
                          const canChangeMemberTeam = currentMember?.role === 'superadmin' || 
                            (currentMember?.role === 'admin' && m.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim());

                          return (
                            <div key={m.id} className="p-3 border border-slate-150 rounded-lg bg-slate-50/30 hover:bg-slate-50 transition flex items-center justify-between text-xs font-semibold gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-sm truncate">{m.name}</span>
                                  {isSelf && (
                                    <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-blue-100 uppercase">
                                      {lang === 'vi' ? 'Bạn' : '自分'}
                                    </span>
                                  )}
                                  <span className="bg-slate-100 text-[#5A5A40] border border-slate-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                    {m.department}
                                  </span>
                                  {m.team && (
                                    <span className="bg-[#D4A373]/10 text-[#5A5A40] border border-[#D4A373]/25 text-[9px] px-2 py-0.5 rounded-full font-bold">
                                      📁 {m.team}
                                    </span>
                                  )}
                                </div>
                                <span className="text-slate-400 text-[10px] block truncate">{m.email}</span>
                                
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                    isSuper ? 'bg-red-50 text-red-700 border border-red-200' : isAdmin ? 'bg-yellow-50 text-amber-700 border border-yellow-200' : 'bg-green-50 text-emerald-700 border border-green-200'
                                  }`}>
                                    {m.role === 'superadmin' ? 'Super Admin' : m.role === 'admin' ? 'Admin' : 'Member'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                                {/* Department selector (Super Admin only can edit, Admin cannot) */}
                                <select
                                  value={m.department}
                                  disabled={!canChangeMemberDept}
                                  onChange={(e) => handleUpdateMemberDept(m.id, e.target.value)}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-700 outline-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  {departmentsList.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                  ))}
                                </select>

                                {/* Team selector (Admin of of his dept & Superadmin can edit) */}
                                <select
                                  value={m.team || ''}
                                  disabled={!canChangeMemberTeam}
                                  onChange={(e) => {
                                    const nextTeam = e.target.value;
                                    const storedAll = getStoredMembers();
                                    const updated = storedAll.map(member => {
                                      if (member.id === m.id) {
                                        return { ...member, team: nextTeam || undefined };
                                      }
                                      return member;
                                    });
                                    saveMembers(updated);

                                    addAuditLog(
                                      lang === 'vi' ? 'Cập nhật nhóm' : 'メンバーチーム更新',
                                      currentMember?.name || 'Unknown',
                                      currentMember?.email || 'unknown@dymvietnam.net',
                                      lang === 'vi' 
                                        ? `Đã thay đổi nhóm của nhân viên "${m.name}" (${m.email}) thành "${nextTeam || 'Không có nhóm'}"`
                                        : `メンバー "${m.name}" (${m.email}) のチームを "${nextTeam || 'チームなし'}" に更新しました`
                                    );
                                    setAuditLogs(getStoredAuditLogs());

                                    if (onMembersChange) {
                                      onMembersChange(updated);
                                    }
                                    if (currentMember?.role === 'admin') {
                                      setMembers(updated.filter(me => me.department.toLowerCase().trim() === currentMember.department.toLowerCase().trim()));
                                    } else {
                                      setMembers(updated);
                                    }
                                  }}
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-700 outline-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <option value="">{lang === 'vi' ? '--- Chọn Team ---' : '--- Team無し ---'}</option>
                                  {(deptTeams[m.department] || []).map(tName => (
                                    <option key={tName} value={tName}>{tName}</option>
                                  ))}
                                </select>

                                {/* Role selector (Super Admin only can edit, Admin cannot) */}
                                <select
                                  value={m.role}
                                  disabled={!canChangeMemberRole}
                                  onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as 'superadmin' | 'admin' | 'member')}
                                  className="bg-white border border-slate-205 rounded px-2 py-1 text-[11px] font-bold text-slate-700 outline-none disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <option value="member">{lang === 'vi' ? 'Member' : '一般'}</option>
                                  <option value="admin">{lang === 'vi' ? 'Admin' : '管理者'}</option>
                                  <option value="superadmin">{lang === 'vi' ? 'Super Admin' : '最高特権'}</option>
                                </select>

                                {/* Delete member button */}
                                {canDeleteMember && (
                                  <button
                                    onClick={() => handleDeleteMember(m.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                    title={lang === 'vi' ? 'Xóa nhân viên' : '社員アカウントを削除'}
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: CSV EXPORT */}
          {activeTab === 'sheets' && (
            <div className="space-y-6" id="sheets-tab-content">
              {/* DETAILED CSV EXPORTER MODULE */}
              <GasExport submissions={submissions} lang={lang} />
            </div>
          )}

          {/* TAB CONTENT: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4" id="audit-logs-tab-content">
              {/* Filter controls */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-end">
                <div className="grow w-full">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    {lang === 'vi' ? 'Tìm kiếm lịch sử chỉnh sửa' : '操作履歴を検索'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'vi' ? 'Tìm theo tên, email hoặc nội dung chỉnh sửa...' : '操作者、メールアドレス、内容で検索...'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-[#5A5A40] font-medium"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                  />
                </div>
                {currentMember?.role === 'superadmin' && (
                  <button
                    onClick={() => {
                      setCustomModal({
                        type: 'confirm',
                        titleVi: 'Xóa toàn bộ lịch sử hệ thống',
                        titleJa: '全操作履歴の初期化確認',
                        messageVi: 'Bạn có thực sự chắc chắn muốn xóa TOÀN BỘ lịch sử hoạt động hệ thống không? Hành động này sẽ dọn sạch tất cả dữ liệu audit log và không thể hoàn tác.',
                        messageJa: 'すべての操作履歴を消去しますか？この操作を実行すると元に戻すことはできません。',
                        onConfirm: () => {
                          saveAuditLogs([]);
                          setAuditLogs([]);
                          setCustomModal(null);
                        }
                      });
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-150 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {lang === 'vi' ? 'Xóa lịch sử' : '履歴消去'}
                  </button>
                )}
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto p-4">
                {(() => {
                  const filtered = auditLogs.filter(log => {
                    if (!auditSearchQuery) return true;
                    const query = auditSearchQuery.toLowerCase().trim();
                    return (
                      log.actorName.toLowerCase().includes(query) ||
                      log.actorEmail.toLowerCase().includes(query) ||
                      log.action.toLowerCase().includes(query) ||
                      log.details.toLowerCase().includes(query)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 text-xs font-medium">
                        {lang === 'vi' ? 'Không có hoạt động nào được ghi lại' : '操作履歴が見つかりません。'}
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold tracking-wider">
                          <th className="py-3 px-2 w-[180px]">{lang === 'vi' ? 'Thời gian' : '操作日時'}</th>
                          <th className="py-3 px-2 w-[180px]">{lang === 'vi' ? 'Người thực hiện' : '操作者'}</th>
                          <th className="py-3 px-2 w-[150px]">{lang === 'vi' ? 'Hành động' : '操作種類'}</th>
                          <th className="py-3 px-2 text-left">{lang === 'vi' ? 'Chi tiết chỉnh sửa' : '詳細内容'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((log) => (
                          <tr key={log.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition font-medium">
                            <td className="py-3 px-2 font-mono text-[11px] text-slate-500">
                              {formatDateTimeVietnamese(log.timestamp)}
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-extrabold text-slate-900 block">{log.actorName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{log.actorEmail}</span>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold block w-max uppercase tracking-wider ${
                                log.action.includes('Xóa') || log.action.includes('削除') 
                                  ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                                  : log.action.includes('Tạo') || log.action.includes('新規') || log.action.includes('Thêm')
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                              {log.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB CONTENT: PROGRESS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6" id="dashboard-tab-content">
              {/* Exam Selection & Filters Header control */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm font-serif">
                       {lang === 'vi' 
                         ? `Tiến Độ Hoàn Thành Khảo Sát & Đào Tạo${currentMember?.role === 'admin' ? ` - Bộ phận ${currentMember.department}` : ''}` 
                         : `受検状況分析ダッシュボード${currentMember?.role === 'admin' ? ` - ${currentMember.department}部門` : ''}`}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                       {lang === 'vi' 
                         ? 'Sử dụng các bộ lọc dưới đây để tra cứu kết quả chi tiết từng đợt khảo thí theo phòng ban.' 
                         : '各部署の定期試験進捗状況および未受検・提出済みステータスを詳細に分析します。'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Filter 1: Deployment Date */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      {lang === 'vi' ? 'Ngày triển khai đề thi' : '試験実施日 (Deployment Date)'}
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition"
                        value={dashboardDateFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDashboardDateFilter(val);
                          // Clear selected exam if it doesn't match the new date filter
                          if (val) {
                            const matchedExams = exams.filter(ex => ex.startTime.startsWith(val));
                            if (matchedExams.length > 0) {
                              setDashboardExamId(matchedExams[0].id);
                            } else {
                              setDashboardExamId('');
                            }
                          }
                        }}
                      />
                      {dashboardDateFilter && (
                        <button
                          type="button"
                          onClick={() => setDashboardDateFilter('')}
                          className="absolute right-2 top-1.5 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition"
                        >
                          {lang === 'vi' ? 'Xóa' : 'clear'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter 2: Select Exam (filtered by deployment date if set) */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      {lang === 'vi' ? 'Chọn đề kiểm tra định kỳ' : '対象試験を選択'}
                    </label>
                    <select
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition"
                      value={dashboardExamId}
                      onChange={(e) => setDashboardExamId(e.target.value)}
                    >
                      <option value="">{lang === 'vi' ? '--- Chọn đề kiểm tra ---' : '--- 試験を選択 ---'}</option>
                      {exams
                        .filter(ex => !dashboardDateFilter || ex.startTime.startsWith(dashboardDateFilter))
                        .map(ex => (
                          <option key={ex.id} value={ex.id}>
                            {ex.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Filter 3: Select Department */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      {lang === 'vi' ? 'Xem tiến độ theo bộ phận' : '部署フィルター (Department)'}
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition disabled:opacity-60 disabled:cursor-not-allowed"
                      value={dashboardDeptFilter}
                      disabled={currentMember?.role === 'admin'}
                      onChange={(e) => {
                        setDashboardDeptFilter(e.target.value);
                        setDashboardTeamFilter('all'); // Reset team filter when department changes
                      }}
                    >
                      {currentMember?.role === 'admin' ? (
                        <option value={currentMember.department}>{currentMember.department}</option>
                      ) : (
                        <>
                          <option value="all">{lang === 'vi' ? 'Tất cả bộ phận' : '全部門'}</option>
                          {departmentsList.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Filter 4: Select Team (Progress Dashboard Team Filtering) */}
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                      {lang === 'vi' ? 'Nhánh Team' : '所属チーム'}
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition"
                      value={dashboardTeamFilter}
                      onChange={(e) => setDashboardTeamFilter(e.target.value)}
                    >
                      <option value="all">{lang === 'vi' ? 'Tất cả Team' : 'すべてのチーム'}</option>
                      <option value="none">{lang === 'vi' ? 'Chưa phân Team' : 'チーム未分類'}</option>
                      {(() => {
                        const activeDept = currentMember?.role === 'admin' ? currentMember.department : dashboardDeptFilter;
                        if (activeDept === 'all') {
                          const allTeams = Object.values(deptTeams).flat();
                          const uniqueTeams = Array.from(new Set(allTeams));
                          return uniqueTeams.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ));
                        } else {
                          const list = deptTeams[activeDept] || [];
                          return list.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ));
                        }
                      })()}
                    </select>
                  </div>
                </div>
              </div>

              {(() => {
                const selectedExam = exams.find(e => e.id === dashboardExamId);
                if (!dashboardExamId || !selectedExam) {
                  return (
                    <div className="bg-white border border-slate-200 p-8 rounded-xl text-center text-slate-400 text-xs font-medium">
                      {lang === 'vi' ? 'Vui lòng chọn một đề kiểm tra ở phía trên để hiển thị thống kê chi tiết.' : '詳細情報を表示するには、上のプルダウンから試験を選択してください。'}
                    </div>
                  );
                }

                // Submissions for this specific exam
                const examSubmissions = submissions.filter(sub => sub.examId === selectedExam.id);
                const submittedEmailsSet = new Set(examSubmissions.map(sub => sub.employeeEmail.toLowerCase().trim()));

                // Filter in-scope members: Admin only sees their own team/department, Super Admin sees everyone
                let inScopeMembers = currentMember?.role === 'superadmin'
                  ? members
                  : members.filter(m => m.department.toLowerCase().trim() === (currentMember?.department || '').toLowerCase().trim());

                // Apply Dashboard Department filter if selected
                if (currentMember?.role === 'superadmin' && dashboardDeptFilter !== 'all') {
                  inScopeMembers = inScopeMembers.filter(m => m.department.toLowerCase().trim() === dashboardDeptFilter.toLowerCase().trim());
                }

                // Apply Dashboard Team filter if selected
                if (dashboardTeamFilter !== 'all') {
                  if (dashboardTeamFilter === 'none') {
                    inScopeMembers = inScopeMembers.filter(m => !m.team);
                  } else {
                    inScopeMembers = inScopeMembers.filter(m => m.team && m.team.toLowerCase().trim() === dashboardTeamFilter.toLowerCase().trim());
                  }
                }

                // Partition in-scope members
                const submittedMembers = inScopeMembers.filter(m => submittedEmailsSet.has(m.email.toLowerCase().trim()));
                const notSubmittedMembers = inScopeMembers.filter(m => !submittedEmailsSet.has(m.email.toLowerCase().trim()));

                const totalInScope = inScopeMembers.length;
                const progressPercentage = totalInScope > 0 ? Math.round((submittedMembers.length / totalInScope) * 100) : 0;

                return (
                  <div className="space-y-6">
                    {/* STATS BREAKDOWN GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                          {lang === 'vi' ? 'ĐỊA BÀN KHẢO SÁT' : '対象試験'}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900 block mt-1.5 truncate">
                          {selectedExam.title}
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">
                          {lang === 'vi' ? 'TỔNG SỐ NHÂN SỰ' : '総社員数'}
                        </span>
                        <span className="text-2xl font-black text-slate-800 block mt-1 font-serif italic">
                          {totalInScope}
                        </span>
                      </div>

                      <div className="bg-white border border-slate-100 p-5 rounded-xl border-l-4 border-l-emerald-500 shadow-xs">
                        <span className="text-[10px] text-emerald-600 font-bold block uppercase">
                          {lang === 'vi' ? 'ĐÃ NỘP BÀI (HOÀN THÀNH)' : '提出完了'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-emerald-600 font-serif italic">
                            {submittedMembers.length}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            ({progressPercentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 p-5 rounded-xl border-l-4 border-l-amber-500 shadow-xs">
                        <span className="text-[10px] text-amber-600 font-bold block uppercase">
                          {lang === 'vi' ? 'CHƯA NỘP BÀI (TRỄ HẠN/ĐANG CHỜ)' : '未提出'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-2xl font-black text-amber-600 font-serif italic">
                            {notSubmittedMembers.length}
                          </span>
                          <span className="text-xs text-slate-400 font-bold">
                            ({100 - progressPercentage}%)
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* PROGRESS BAR */}
                    <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
                        <span>{lang === 'vi' ? 'Tiến độ hoàn thành tổng quát' : '全体の受検進捗率'}</span>
                        <span className="text-slate-800">{progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#5A5A40] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${progressPercentage}%` }} 
                        />
                      </div>
                    </div>

                    {/* DETAIL LIST PARTITIONS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* SUBMITTED LIST COMPONENT */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                          <h4 className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
                            {lang === 'vi' ? 'Danh sách đã nộp bài' : '提出完了者リスト'}
                          </h4>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] px-2 py-0.5 rounded">
                            {submittedMembers.length}
                          </span>
                        </div>

                        {submittedMembers.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            {lang === 'vi' ? 'Chưa có nhân sự nào nộp bài thi này.' : 'まだ提出者がいません。'}
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                            {submittedMembers.map(m => {
                              // Find their submission details for maximum accuracy
                              const subDetails = examSubmissions.find(s => s.employeeEmail.toLowerCase().trim() === m.email.toLowerCase().trim());
                              const accuracy = subDetails ? Math.round((subDetails.score / subDetails.maxScore) * 100) : 0;
                              return (
                                <div key={m.id} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-slate-50 transition flex items-center justify-between text-xs font-semibold font-sans">
                                  <div>
                                    <span className="font-extrabold text-slate-800 block">{m.name}</span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{m.email}</span>
                                    <span className="bg-slate-100 border text-[9px] px-1.5 py-0.5 rounded text-slate-600 inline-block mt-1">
                                      {m.department}
                                    </span>
                                  </div>

                                  <div className="text-right">
                                    {subDetails && (
                                      <>
                                        <span className="text-xs font-black text-slate-800 block">
                                          {subDetails.score}/{subDetails.maxScore} ({accuracy}%)
                                        </span>
                                        <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                                          {formatDateTimeVietnamese(subDetails.submittedAt)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* NOT SUBMITTED LIST COMPONENT */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                          <h4 className="font-bold text-amber-700 text-sm flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block animate-pulse" />
                            {lang === 'vi' ? 'Danh sách chưa nộp bài' : '未提出者リスト'}
                          </h4>
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-extrabold text-[10px] px-2 py-0.5 rounded">
                            {notSubmittedMembers.length}
                          </span>
                        </div>

                        {notSubmittedMembers.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 text-xs">
                            {lang === 'vi' ? 'Đã hoàn thành 100%. Không có nhân sự nào bỏ dở!' : 'すべて提出完了しました！該当者はいません。'}
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                            {notSubmittedMembers.map(m => (
                              <div key={m.id} className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-slate-50 transition flex items-center justify-between text-xs font-semibold font-sans">
                                <div>
                                  <span className="font-extrabold text-slate-800 block">{m.name}</span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{m.email}</span>
                                  <span className="bg-slate-100 border text-[9px] px-1.5 py-0.5 rounded text-slate-600 inline-block mt-1">
                                    {m.department}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                    {lang === 'vi' ? 'Chưa Làm' : '未受験'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      ) : (
        
        // --- MASTER EXAM CREATOR FORM BUILDER (CHỈNH SỬA, THIẾT LẬP THỜI GIAN, NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM) ---
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-xs max-w-4xl mx-auto animate-in zoom-in-95" id="exam-builder-form-flow">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">
                {editingExamId === 'new' ? 'CREATING MASTER EXAM' : 'EDITING MASTER EXAM'}
              </span>
              <h2 className="text-xl font-bold font-serif text-slate-900 mt-0.5">Biên soạn Đề Khảo Sát Tự Động Chấm</h2>
            </div>
            
            <button
              onClick={() => setEditingExamId(null)}
              className="text-slate-400 hover:text-slate-600 transition cursor-pointer text-xs font-bold inline-flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              {t.btnDiscard}
            </button>
          </div>

          <form onSubmit={handleSaveExam} className="space-y-6 text-xs font-semibold text-slate-700">
            
            {/* GENERAL SECTION INFORMATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{t.examTitle} (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đánh giá Năng lực Kỹ sư Cầu nối Việt Nhật tháng 6"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-[#5A5A40] font-bold"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">{t.examDescription}</label>
                <textarea
                  placeholder="Mô tả tóm tắt mục đích khảo thí..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs outline-none focus:border-[#5A5A40] font-medium resize-none"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              {/* TIMELINE FIELDS */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#D4A373]" />
                  {t.startTime} (*)
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#D4A373]" />
                  {t.endTime} (*)
                </label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40]"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#D4A373]" />
                  {lang === 'vi' ? 'Thời lượng làm bài (Phút)' : '制限時間 (分)'} (*)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value) || 1)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[#D4A373]" />
                  {lang === 'vi' ? 'Bộ phận áp dụng đề thi' : '対象部署'} (*)
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                  value={formDepartment}
                  onChange={(e) => {
                    setFormDepartment(e.target.value);
                    setFormTeam(''); // Clear team when department changes
                  }}
                >
                  <option value="All">{lang === 'vi' ? 'All (Tất cả bộ phận)' : 'All (全対象)'}</option>
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {formDepartment !== 'All' && (
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#D4A373]" />
                    {lang === 'vi' ? 'Nhánh Team thuộc bộ phận' : '対象チーム'}
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                  >
                    <option value="">{lang === 'vi' ? '--- Tất cả Team thuộc bộ phận này ---' : '--- すべてのチームを対象 ---'}</option>
                    {(deptTeams[formDepartment] || []).map((tName) => (
                      <option key={tName} value={tName}>
                        📁 {tName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* QUESTIONS BUILDER WORKSPACE */}
            <div className="space-y-4 pt-4 border-t border-slate-100" id="form-builder-questions-list">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm font-serif">{lang === 'vi' ? 'Ngân hàng câu hỏi & Đáp án tương thích' : '試験設問と自動採点の設定'}</h3>
                
                <button
                  type="button"
                  onClick={addQuestionToForm}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-250 text-[#5A5A40] rounded text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition border border-slate-200"
                >
                  <PlusCircle className="w-4 h-4" />
                  {lang === 'vi' ? 'Thêm câu hỏi' : '設問を追加'}
                </button>
              </div>

              {formQuestions.map((q, qIdx) => {
                const isSingle = q.type === 'single';

                return (
                  <div key={q.id} className="border border-slate-200 rounded-xl p-4 md:p-5 bg-slate-50/20 space-y-4">
                    
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#5A5A40] text-white font-bold w-5 h-5 rounded flex items-center justify-center text-[10px]">
                          {qIdx + 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeQuestionFromForm(qIdx)}
                        className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                        title="Xóa câu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question properties */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{lang === 'vi' ? 'Nội dung câu hỏi' : '設問テキスト'}</label>
                        <textarea
                          required
                          rows={2}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold resize-y"
                          placeholder={lang === 'vi' ? 'Nhập câu hỏi... (Nhấn Enter để xuống dòng)' : '質問を入力してください... (Enterキーで改行できます)'}
                          value={q.text}
                          onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{lang === 'vi' ? 'Điểm thành phần' : '配点'}</label>
                        <input
                          type="number"
                          required
                          min={1}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#5A5A40] font-bold"
                          value={q.points}
                          onChange={(e) => updateQuestionPoints(qIdx, Number(e.target.value) || 1)}
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">{lang === 'vi' ? 'Loại hình trả lời' : '解答方式'}</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                            <input
                              type="radio"
                              name={`type-${q.id}`}
                              checked={isSingle}
                              onChange={() => updateQuestionType(qIdx, 'single')}
                              className="text-[#5A5A40] focus:ring-[#5A5A40]"
                            />
                            {lang === 'vi' ? 'Trắc nghiệm 1 đáp án đúng (Radio)' : '単一選択 (ラジオボタン)'}
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold">
                            <input
                              type="radio"
                              name={`type-${q.id}`}
                              checked={!isSingle}
                              onChange={() => updateQuestionType(qIdx, 'multiple')}
                              className="text-[#5A5A40] focus:ring-[#5A5A40]"
                            />
                            {lang === 'vi' ? 'Trắc nghiệm chọn nhiều đáp án đúng (Checkbox)' : '複数選択 (チェックボックス)'}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Options list selection */}
                    <div className="space-y-2 pl-4 border-l-2 border-[#E5E2D9]">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-slate-400 uppercase font-bold">
                          {lang === 'vi' ? 'Danh sách các lựa chọn (Đánh dấu tích để nạp đáp án đúng)' : '選択肢リスト (自動採点用の正答にチェックマークを入れてください)'}
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => addOptionToQuestion(qIdx)}
                          className="text-[10px] text-[#5A5A40] hover:underline cursor-pointer font-bold"
                        >
                          + {lang === 'vi' ? 'Thêm phương án' : '選択肢を増やす'}
                        </button>
                      </div>

                      {q.options.map((option, optIdx) => {
                        const isCorrect = q.correctAnswers.includes(optIdx);

                        return (
                          <div key={optIdx} className="flex items-center gap-2">
                            {/* Check mark toggle */}
                            <button
                              type="button"
                              onClick={() => toggleOptionCorrectness(qIdx, optIdx)}
                              className={`p-1.5 border rounded-lg shrink-0 transition cursor-pointer ${
                                isCorrect 
                                  ? 'bg-[#5A5A40]/10 border-[#5A5A40] text-[#5A5A40]' 
                                  : 'bg-white border-slate-200 text-slate-300 hover:border-[#D4A373]'
                              }`}
                              title={lang === 'vi' ? 'Đặt làm đáp án đúng' : '正解解答としてマーク'}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            </button>

                            <textarea
                              required
                              rows={1}
                              placeholder={lang === 'vi' ? 'Nhập phương án trả lời...' : '選択肢を入力してください...'}
                              className="grow bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-[#5A5A40] font-medium resize-y"
                              value={option}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                            />

                            <button
                              type="button"
                              onClick={() => removeOptionFromQuestion(qIdx, optIdx)}
                              className="text-slate-300 hover:text-red-500 transition cursor-pointer p-1"
                              title="Xóa lựa chọn"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Form submit footer */}
            <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingExamId(null)}
                className="px-5 py-2 border border-slate-250 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                {t.btnDiscard}
              </button>
              
              <button
                type="submit"
                className="px-6 py-2 bg-[#5A5A40] hover:bg-[#4D4D36] text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                {t.btnSaveAndLaunch}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* DETAILED SUBMISSION VIEW MODAL (TRANSCRIPT DIALOG OF SELECTED CANDIDATE SUBMISSION) */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="submission-detail-modal">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 md:p-8 max-h-[85vh] overflow-y-auto space-y-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setSelectedSubmission(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-4">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded uppercase">
                {lang === 'vi' ? 'Chi Tiết Kết Quả Khảo Thí' : '受験結果詳細データ'}
              </span>
              <h3 className="text-lg font-bold font-serif text-slate-900 mt-1.5">{selectedSubmission.examTitle}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{lang === 'vi' ? 'Mã số phiếu:' : '受験ID:'} {selectedSubmission.id}</p>
            </div>

            {/* Candidate metadata summary card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-semibold text-slate-500">
              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-bold">{t.employeeName}</span>
                <span className="text-slate-900 text-sm font-extrabold">{selectedSubmission.employeeName}</span>
                <span className="block text-slate-400 font-mono font-medium text-[10px] mt-0.5">{selectedSubmission.employeeEmail}</span>
              </div>

              <div>
                <span className="block text-[9px] text-slate-400 uppercase font-bold">{t.employeeDept}</span>
                <span className="text-slate-950 font-bold">{selectedSubmission.employeeDepartment || 'N/A'}</span>
              </div>

              <div className="border-t border-slate-200 pt-3 mt-1.5">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">{t.scoreLabel}</span>
                <span className="text-slate-900 font-extrabold text-base">{selectedSubmission.score} / {selectedSubmission.maxScore}</span>
                <span className="text-[#5A5A40] text-[10px] ml-1.5">({Math.round((selectedSubmission.score / selectedSubmission.maxScore) * 100) || 0}% Acc)</span>
              </div>

              <div className="border-t border-slate-200 pt-3 mt-1.5">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">{t.submittedAt}</span>
                <span className="text-slate-900 font-bold">{formatDateTimeVietnamese(selectedSubmission.submittedAt)}</span>
              </div>
            </div>

            {/* Answer sheet responses logs */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm font-serif border-b border-slate-100 pb-2">{lang === 'vi' ? 'Kết quả phản hồi của từng câu hỏi' : '設問ごとの解答詳細'}</h4>
              
              {/* Try finding the exam in states, otherwise substitute with simulated content */}
              {(exams.find(e => e.id === selectedSubmission.examId)?.questions || []).map((q, qIndex) => {
                const userChoice = selectedSubmission.answers[q.id] || [];
                const correct = q.correctAnswers;
                const correctMatches = userChoice.length === correct.length && userChoice.every(v => correct.includes(v));

                return (
                  <div key={q.id} className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex justify-between gap-4">
                      <span className="font-bold text-slate-900 text-xs whitespace-pre-wrap">
                        {lang === 'vi' ? `Câu ${qIndex + 1}:` : `問 ${qIndex + 1}:`} {q.text}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        correctMatches ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {correctMatches ? (lang === 'vi' ? 'Đúng' : '正解') : (lang === 'vi' ? 'Sai' : '不正解')}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-slate-200 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = userChoice.includes(oIdx);
                        const isCorrectOpt = correct.includes(oIdx);

                        let flagColor = 'text-slate-600';
                        if (isChosen && isCorrectOpt) {
                          flagColor = 'text-emerald-700 font-extrabold';
                        } else if (isChosen && !isCorrectOpt) {
                          flagColor = 'text-rose-600 font-bold';
                        } else if (!isChosen && isCorrectOpt) {
                          flagColor = 'text-slate-700 font-bold';
                        }

                        return (
                          <div key={oIdx} className="flex items-center gap-2 py-0.5">
                            <span className={`${flagColor} whitespace-pre-wrap`}>{opt}</span>
                            <div className="flex gap-1 text-[8px] font-bold">
                              {isChosen && <span className="bg-[#5A5A40]/10 border border-[#5A5A40]/20 px-1 py-0.2 rounded text-[#5A5A40] text-[8px]">
                                {t.userSelected}
                              </span>}
                              {isCorrectOpt && <span className="bg-emerald-50 border border-emerald-150 px-1 py-0.2 rounded text-emerald-700 text-[8px]">
                                {t.correctAnswer}
                              </span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal action buttons */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 border border-slate-250 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {lang === 'vi' ? 'Đóng cửa sổ' : '閉じる'}
              </button>
              
              <button
                onClick={() => {
                  handleSyncToSheets(selectedSubmission);
                  setSelectedSubmission(null);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition cursor-pointer"
              >
                {lang === 'vi' ? 'Đồng bộ kết quả này lên Sheet' : 'この結果のみ同期'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION & ALERT MODAL */}
      {customModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 relative shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-full shrink-0 ${customModal.type === 'confirm' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  {lang === 'vi' ? customModal.titleVi : customModal.titleJa}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  {lang === 'vi' ? customModal.messageVi : customModal.messageJa}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 text-xs">
              {customModal.type === 'confirm' ? (
                <>
                  <button
                    onClick={() => setCustomModal(null)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition font-bold cursor-pointer"
                  >
                    {lang === 'vi' ? 'Hủy bỏ' : 'キャンセル'}
                  </button>
                  <button
                    onClick={() => {
                      if (customModal.onConfirm) {
                        customModal.onConfirm();
                      }
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition cursor-pointer"
                  >
                    {lang === 'vi' ? 'Xác nhận xóa' : '削除する'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setCustomModal(null)}
                  className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4D4D36] text-white font-bold rounded-lg transition cursor-pointer font-bold"
                >
                  {lang === 'vi' ? 'Đã hiểu' : '了解'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW EMPLOYEE SEPARATE MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="add-member-modal">
          <form 
            onSubmit={(e) => {
              handleAddMember(e);
            }} 
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 relative shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setShowAddMemberModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#5A5A40]" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-serif">
                  {lang === 'vi' ? 'Đăng Ký Nhân Sự Mới' : '新規社員의 登録'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {lang === 'vi' ? 'Đăng ký tài khoản nhân viên mới vào hệ thống.' : '社内システムに新しいメンバー情報を追加・発行します。'}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700">
              {/* Full Name */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {lang === 'vi' ? 'Họ và tên nhân sự' : '氏名'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'vi' ? 'VD: Nguyễn Văn A' : '例: 山田 太郎'}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl p-2.5 text-xs outline-none focus:border-[#5A5A40] text-slate-800 transition font-bold"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>

              {/* Email address */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {lang === 'vi' ? 'địa chỉ Email' : 'メールアドレス'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl p-2.5 text-xs outline-none focus:border-[#5A5A40] text-slate-800 transition font-bold"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>

              {/* Department Selector */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {lang === 'vi' ? 'Bộ phận trực thuộc' : '所属部署'}
                </label>
                {currentMember?.role === 'admin' ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-extrabold capitalize text-xs">
                    {currentMember.department}
                  </div>
                ) : (
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#5A5A40] text-slate-800 transition font-bold cursor-pointer"
                    value={newMemberDept}
                    onChange={(e) => {
                      setNewMemberDept(e.target.value);
                      setNewMemberTeam(''); // reset selected team when dept changes
                    }}
                  >
                    {departmentsList.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Team Selector */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {lang === 'vi' ? 'Nhánh Team trực thuộc' : '所属チーム'}
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#5A5A40] text-slate-800 transition font-bold cursor-pointer"
                  value={newMemberTeam}
                  onChange={(e) => setNewMemberTeam(e.target.value)}
                >
                  <option value="">{lang === 'vi' ? '--- Không thuộc Team nào ---' : '--- チーム所属なし ---'}</option>
                  {(deptTeams[currentMember?.role === 'admin' ? currentMember.department : newMemberDept] || []).map(tName => (
                    <option key={tName} value={tName}>{tName}</option>
                  ))}
                </select>
              </div>

              {/* Privileges/Role Selector */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {lang === 'vi' ? 'Quyền hạn truy cập' : '権限 (Access Role)'}
                </label>
                {currentMember?.role === 'admin' ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[#5A5A40] font-extrabold text-xs">
                    Member (Chỉ có quyền thi, khảo sát) / 一般
                  </div>
                ) : (
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-[#5A5A40] text-slate-800 transition font-bold cursor-pointer"
                    value={newMemberRole}
                    onChange={(e) => {
                      const r = e.target.value as 'superadmin' | 'admin' | 'member';
                      setNewMemberRole(r);
                    }}
                  >
                    <option value="member">{lang === 'vi' ? 'Member (Thành viên - Chỉ thi & khảo sát)' : '一般メンバー'}</option>
                    <option value="admin">{lang === 'vi' ? 'Admin (Quản lý cấp bộ phận)' : '部門管理者 (Admin)'}</option>
                    <option value="superadmin">{lang === 'vi' ? 'Super Admin (Ban quản trị tối cao)' : 'システム管理者 (Super Admin)'}</option>
                  </select>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 border border-slate-250 bg-white text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                {lang === 'vi' ? 'Hủy bỏ' : 'キャンセル'}
              </button>
              
              <button
                type="submit"
                className="px-5 py-2 bg-[#5A5A40] hover:bg-[#4D4D36] text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                {lang === 'vi' ? 'Lưu & Khởi tạo' : '登録する'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
