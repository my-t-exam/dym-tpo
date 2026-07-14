/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, ArrowRight, Clock, AlertCircle, CheckCircle, 
  ChevronRight, ArrowLeft, Send, Award, HelpCircle, FileText, Check, ShieldAlert
} from 'lucide-react';
import { Exam, Submission, Member, Language } from '../types';
import { formatDept, formatTeam } from '../lib/localization';
import { 
  getStoredExams, getStoredSubmissions, saveSubmissions, 
  getStoredSheetsUrl, calculateScore, syncWithGoogleSheets,
  getStoredMembers, getStoredDepartments, getStoredTeams,
  addAuditLog
} from '../lib/database';
import { translations } from '../data/translations';
import { getSyncedTime, parseAsVietnamTime, formatInVietnamTime } from '../lib/time';

interface ExamPortalProps {
  currentMember: Member | null;
  lang: Language;
}

export default function ExamPortal({ currentMember, lang }: ExamPortalProps) {
  const t = translations[lang];

  // Database state
  const [exams, setExams] = useState<Exam[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [examsPage, setExamsPage] = useState<number>(1);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Filter & Search Exam states for student
  const [searchPortalExamQuery, setSearchPortalExamQuery] = useState('');
  const [portalTeamFilter, setPortalTeamFilter] = useState('all');
  const [teamsMap, setTeamsMap] = useState<Record<string, string[]>>({});

  // Portal view screen states
  type Screen = 'select-exam' | 'register' | 'waiting-room' | 'active-test' | 'result';
  const [screen, setScreen] = useState<Screen>('select-exam');

  // Examination states
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeDepartment, setEmployeeDepartment] = useState('');
  const [employeeTeam, setEmployeeTeam] = useState('');
  
  // Track starting timestamp of active examination
  const [testStartedAt, setTestStartedAt] = useState<number>(0);
  // Search query for public exam transcripts
  const [historySearch, setHistorySearch] = useState<string>('');
  // Dynamic countdown in wait screen
  const [waitingCountdown, setWaitingCountdown] = useState<string>('');

  // Running timer states
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // User answer sheets state
  const [answers, setAnswers] = useState<Record<string, number[] | string>>({});
  const answersRef = useRef<Record<string, number[] | string>>({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Finished score states
  const [finalSubmission, setFinalSubmission] = useState<Submission | null>(null);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSyncSuccess, setSheetSyncSuccess] = useState<boolean | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load active exams and submissions list
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);

  useEffect(() => {
    const refreshCacheData = () => {
      setExams(getStoredExams());
      setAllSubmissions(getStoredSubmissions());
      setSheetsUrl(getStoredSheetsUrl());

      // Use our new dynamic stored departments list
      const depts = getStoredDepartments();
      setDepartmentsList(depts);
      setMembersList(getStoredMembers());
      setTeamsMap(getStoredTeams());
    };

    // Load initial data
    refreshCacheData();

    // Start background refresh timer every 10 seconds to align with App.tsx database updates
    const intervalId = setInterval(refreshCacheData, 10000);
    return () => clearInterval(intervalId);
  }, [screen]);

  // Sync currentMember credentials immediately on load or account switch
  useEffect(() => {
    if (currentMember) {
      setEmployeeName(currentMember.name);
      setEmployeeEmail(currentMember.email);
      setEmployeeDepartment(currentMember.department || '');
      setEmployeeTeam(currentMember.team || '');
    } else {
      setEmployeeName('');
      setEmployeeEmail('');
      setEmployeeDepartment('');
      setEmployeeTeam('');
    }
  }, [currentMember]);

  // Handle Exam Selection (Requirement 1, Requirement 4)
  const handleSelectExam = (exam: Exam) => {
    const now = getSyncedTime();
    const start = parseAsVietnamTime(exam.startTime);
    const end = parseAsVietnamTime(exam.endTime);

    // Check if employee has already taken this exam (Requirement 4)
    if (currentMember) {
      const alreadyTaken = allSubmissions.some(sub => 
        sub.examId === exam.id && 
        sub.employeeEmail?.toLowerCase().trim() === currentMember.email?.toLowerCase().trim()
      );
      if (alreadyTaken) {
        alert(lang === 'vi' 
          ? 'Bạn đã làm bài thi này rồi! Mỗi nhân viên chỉ được phép làm bài thi 1 lần. Nếu có thắc mắc vui lòng liên hệ Admin.' 
          : 'この試験はすでに受検済みです！試験は1回のみ受検可能です。問題がある場合は管理者に連絡してください。');
        return;
      }
    }

    if (now < start) {
      setSelectedExam(exam);
      setScreen('waiting-room');
      return;
    }

    if (now > end) {
      const formattedEnd = formatDateTimeVietnamese(exam.endTime);
      alert(`The examination gate has closed at ${formattedEnd}. You cannot take this test anymore.`);
      return;
    }

    // Direct transition to exam (Requirement 1 - bypass register screen completely)
    setSelectedExam(exam);
    setAnswers({});
    if (currentMember) {
      setEmployeeName(currentMember.name);
      setEmployeeEmail(currentMember.email);
      setEmployeeDepartment(currentMember.department || '');
      setEmployeeTeam(currentMember.team || '');
    }
    setSecondsRemaining(exam.duration * 60);
    setTestStartedAt(Date.now());
    setScreen('active-test');
  };

  // Register Employee & Run Admission checks 
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    if (!employeeName.trim() || !employeeEmail.trim()) {
      alert('Please fill in your full name and email address to receive the examination.');
      return;
    }

    const now = getSyncedTime();
    const start = parseAsVietnamTime(selectedExam.startTime);
    const end = parseAsVietnamTime(selectedExam.endTime);

    if (now < start) {
      setScreen('waiting-room');
      return;
    }

    if (now > end) {
      alert('This examination has ended. You are no longer authorized to participate.');
      return;
    }

    // Start Exam!
    setSecondsRemaining(selectedExam.duration * 60);
    setTestStartedAt(Date.now());
    setScreen('active-test');
  };

  // Auto-start exam checking mechanism and countdown in waiting room (Requirement 1)
  useEffect(() => {
    if (screen !== 'waiting-room' || !selectedExam) {
      setWaitingCountdown('');
      return;
    }

    const checkTimeAndCountdown = () => {
      const now = getSyncedTime();
      const start = parseAsVietnamTime(selectedExam.startTime);
      const diffMs = start.getTime() - now.getTime();

      if (diffMs <= 0) {
        // Automatically enter exam room with the user's active account info (Requirement 1)
        if (currentMember) {
          setEmployeeName(currentMember.name);
          setEmployeeEmail(currentMember.email);
          setEmployeeDepartment(currentMember.department || '');
          setEmployeeTeam(currentMember.team || '');
        }
        setAnswers({});
        setSecondsRemaining(selectedExam.duration * 60);
        setTestStartedAt(Date.now());
        setScreen('active-test');
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const hrsStr = hrs > 0 ? `${hrs}:` : '';
        const countdownStr = `${hrsStr}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        setWaitingCountdown(countdownStr);
      }
    };

    // Run first check immediately
    checkTimeAndCountdown();

    const interval = setInterval(checkTimeAndCountdown, 1000);
    return () => clearInterval(interval);
  }, [screen, selectedExam, currentMember]);

  // Run Countdown Timer
  useEffect(() => {
    if (screen === 'active-test' && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Handle automatic submit when seconds reach 0
            triggerAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [screen]);

  // Select answers helpers
  const handleSelectOption = (questionId: string, qType: 'single' | 'multiple', optionIdx: number) => {
    const current = Array.isArray(answers[questionId]) ? (answers[questionId] as number[]) : [];
    
    if (qType === 'single') {
      setAnswers({
        ...answers,
        [questionId]: [optionIdx]
      });
    } else {
      if (current.includes(optionIdx)) {
        setAnswers({
          ...answers,
          [questionId]: current.filter(x => x !== optionIdx)
        });
      } else {
        setAnswers({
          ...answers,
          [questionId]: [...current, optionIdx].sort()
        });
      }
    }
  };

  const handleEssayChange = (questionId: string, value: string) => {
    setAnswers({
      ...answers,
      [questionId]: value
    });
  };

  // Auto-Submit Function (When Timer Hits Zero)
  const triggerAutoSubmit = () => {
    if (!selectedExam) return;
    alert(t.warningAutoSubmit);
    performSubmission(true);
  };

  // Employee Clicks Active Submit
  const handleManualSubmit = () => {
    setShowConfirmModal(true);
  };

  // Final Action: Perform local storage submission and webhook post triggers
  const performSubmission = async (isAuto: boolean) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (!selectedExam) return;

    // Gradings
    const currentAnswers = answersRef.current;
    const { score, maxScore } = calculateScore(selectedExam, currentAnswers);

    // Calculate actual elapsed seconds
    const elapsedSeconds = testStartedAt ? Math.floor((Date.now() - testStartedAt) / 1000) : 0;
    const maxExamDurationSeconds = selectedExam.duration * 60;
    const cappedSeconds = Math.max(1, Math.min(elapsedSeconds, maxExamDurationSeconds));

    const submissionObj: Submission = {
      id: `sub-${Date.now()}`,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      employeeName: employeeName.trim(),
      employeeEmail: employeeEmail.trim(),
      employeeDepartment: employeeDepartment.trim() || currentMember?.department || 'N/A',
      employeeTeam: employeeTeam.trim() || currentMember?.team || '',
      answers: currentAnswers,
      score,
      maxScore,
      submittedAt: new Date().toISOString(),
      isAutoSubmitted: isAuto,
      timeTakenSeconds: cappedSeconds
    };

    // Store Submission Logs
    const currentSubs = getStoredSubmissions();
    const updatedSubs = [submissionObj, ...currentSubs];
    saveSubmissions(updatedSubs);

    // Add audit log for exam submission
    addAuditLog(
      'Nộp bài thi | 試験提出',
      employeeName.trim(),
      employeeEmail.trim(),
      `Đã nộp bài thi "${selectedExam.title}". Kết quả: ${score}/${maxScore} (${((score / maxScore) * 10).toFixed(1)}/10 điểm)${isAuto ? ' (Do hết thời gian làm bài)' : ''}. | 試験「${selectedExam.title}」を提出しました。結果: ${score}/${maxScore} (${((score / maxScore) * 10).toFixed(1)}/10 点)${isAuto ? ' (制限時間終了による自動提出)' : ''}。`
    );

    setFinalSubmission(submissionObj);
    
    setScreen('result');

    // Run direct Sheets Sync in background if url exists!
    const savedSheetsUrl = getStoredSheetsUrl();
    if (savedSheetsUrl) {
      setIsSyncingSheet(true);
      const isSuccess = await syncWithGoogleSheets(savedSheetsUrl, submissionObj);
      setSheetSyncSuccess(isSuccess);
      setIsSyncingSheet(false);
    }
  };

  // Reset to take another exam
  const handleExitResult = () => {
    setSelectedExam(null);
    setAnswers({});
    setScreen('select-exam');
  };

  // View historical transcript
  const handleReviewSubmission = (sub: Submission) => {
    const foundExam = exams.find(e => e.id === sub.examId);
    if (foundExam) {
      setSelectedExam(foundExam);
      setAnswers(sub.answers);
      setFinalSubmission(sub);
      setScreen('result');
      // Pre-fill student name to avoid confusion
      setEmployeeName(sub.employeeName);
      setEmployeeEmail(sub.employeeEmail);
      setEmployeeDepartment(sub.employeeDepartment || '');
    } else {
      // If exam was edited/deleted from DB, provide simulated view of historical data
      const mockExam: Exam = {
        id: sub.examId,
        title: sub.examTitle,
        description: 'Archived historical exam paper',
        startTime: sub.submittedAt,
        endTime: sub.submittedAt,
        duration: 0,
        questions: Object.keys(sub.answers).map((qId, idx) => ({
          id: qId,
          text: `Question Item #${idx + 1} (Answer Recorded)`,
          type: 'single',
          options: ['Our selection'],
          correctAnswers: [0],
          points: 1
        })),
        createdAt: sub.submittedAt
      };
      setSelectedExam(mockExam);
      setAnswers(sub.answers);
      setFinalSubmission(sub);
      setScreen('result');
    }
  };

  // Formatting minutes/seconds
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTimeVietnamese = (isoString: string) => {
    return formatInVietnamTime(isoString);
  };

  // Only display submissions corresponding to this current simulated/logged-in member (Requirement 1)
  const mySubmissions = allSubmissions.filter(sub => {
    const isMine = currentMember && sub.employeeEmail?.toLowerCase().trim() === currentMember.email?.toLowerCase().trim();
    if (!isMine) return false;

    if (!historySearch.trim()) return true;
    const query = historySearch.toLowerCase().trim();
    return sub.examTitle.toLowerCase().includes(query) ||
           (sub.employeeDepartment && sub.employeeDepartment.toLowerCase().includes(query));
  });

  // Filter active exams based on current member's role and department (Requirement 2)
  const sortedExams = [...exams]
    .filter(ex => {
      if (!currentMember) return false;
      
      // Superadmin can see all exams
      if (currentMember.role === 'superadmin') {
        if (portalTeamFilter !== 'all') {
          if (portalTeamFilter === 'none') {
            if (ex.team) return false;
          } else {
            if (!ex.team || ex.team.toLowerCase().trim() !== portalTeamFilter.toLowerCase().trim()) return false;
          }
        }
      } else {
        // Member can only see exams of their own department, plus 'All' / 'Chung'
        const targetDept = ex.department || 'All';
        const isDeptAll = targetDept.toLowerCase().trim() === 'all' || targetDept.toLowerCase().trim() === 'chung';
        if (!isDeptAll && targetDept.toLowerCase().trim() !== currentMember.department?.toLowerCase().trim()) {
          return false;
        }

        // Tùy vào member team nào sẽ nhìn được đề thi team đó
        if (ex.team && ex.team.toLowerCase().trim() !== 'all' && ex.team.toLowerCase().trim() !== '') {
          const memberTeam = currentMember.team || '';
          if (memberTeam.toLowerCase().trim() !== ex.team.toLowerCase().trim()) {
            return false;
          }
        }

        // Apply student's personal team filter dropdown selection (further narrowing)
        if (portalTeamFilter !== 'all') {
          if (portalTeamFilter === 'none') {
            if (ex.team) return false;
          } else {
            if (!ex.team || ex.team.toLowerCase().trim() !== portalTeamFilter.toLowerCase().trim()) return false;
          }
        }
      }

      // Live search filter (title/description)
      if (searchPortalExamQuery.trim()) {
        const query = searchPortalExamQuery.toLowerCase().trim();
        const matchesTitle = ex.title && ex.title.toLowerCase().includes(query);
        const matchesDesc = ex.description && ex.description.toLowerCase().includes(query);
        const matchesDept = ex.department && ex.department.toLowerCase().includes(query);
        const matchesTeam = ex.team && ex.team.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesDept && !matchesTeam) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Newest first (Requirement 2)
      const timeA = parseAsVietnamTime(a.createdAt || a.startTime || '0').getTime();
      const timeB = parseAsVietnamTime(b.createdAt || b.startTime || '0').getTime();
      return timeB - timeA;
    });

  // Pagination for exams (Requirement 3: max 5 exams per page)
  const EXAMS_PER_PAGE = 5;
  const totalPages = Math.ceil(sortedExams.length / EXAMS_PER_PAGE);
  const currentExams = sortedExams.slice((examsPage - 1) * EXAMS_PER_PAGE, sortedExams.length > 0 ? examsPage * EXAMS_PER_PAGE : 0);

  return (
    <div className="bg-transparent min-h-[50vh] flex items-center justify-center py-6 px-4 sm:px-6 font-sans text-[#1A1A1A]" id="exam-portal-wrapper">
      <div className="max-w-3xl w-full" id="portal-inner-box">

        {/* STEP 1: SELECT ACTIVE TESTS LANDING PAGE */}
        {screen === 'select-exam' && (
          <div className="space-y-6">
            <div className="bg-white rounded-[24px] border border-[#E5E2D9] p-8 shadow-sm" id="screen-select-exam">
              <div className="text-center mb-8">
                <span className="text-[10px] bg-[#5A5A40]/10 border border-[#5A5A40]/20 text-[#5A5A40] font-bold px-3.5 py-1 rounded-full uppercase tracking-widest">
                  {t.memberPortalHeader}
                </span>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mt-3 font-serif italic uppercase tracking-tight">
                  {lang === 'vi' ? 'DANH SÁCH ĐỀ THI' : '試験一覧'}
                </h2>
              </div>

              {/* Dynamic search & team filter controls for Employee */}
              <div className="sticky top-[68px] z-30 grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 p-4 rounded-xl bg-[#FAF9F5] border border-[#E2DFD3] shadow-md">
                <div>
                  <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                    {lang === 'vi' ? 'Tìm Kiếm Đề Thi:' : 'テスト検索:'}
                  </label>
                  <input
                    type="text"
                    value={searchPortalExamQuery}
                    onChange={(e) => {
                      setSearchPortalExamQuery(e.target.value);
                      setExamsPage(1);
                    }}
                    placeholder={lang === 'vi' ? "Nhập tên đề thi..." : "試験名を入力..."}
                    className="w-full bg-white border border-[#E2DFD3] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#5A5A40] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#5A5A40] uppercase tracking-wider mb-1">
                    {lang === 'vi' ? 'Lọc Theo Nhánh Team:' : '所属チームから探す:'}
                  </label>
                  <select
                    value={portalTeamFilter}
                    onChange={(e) => {
                      setPortalTeamFilter(e.target.value);
                      setExamsPage(1);
                    }}
                    className="w-full bg-white border border-[#E2DFD3] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#5A5A40] font-bold cursor-pointer"
                  >
                    <option value="all">{lang === 'vi' ? '--- Tất cả Team / すべてのチーム ---' : '--- すべてのチーム / Tất cả Team ---'}</option>
                    <option value="none">{lang === 'vi' ? 'Chưa phân Team / チーム未分類' : 'チーム未分類 / Chưa phân Team'}</option>
                    {(() => {
                      const dept = currentMember?.department || 'IT部';
                      const list = teamsMap[dept] || [];
                      return list.map(tName => (
                        <option key={tName} value={tName}>{formatTeam(tName, lang)}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div className="space-y-4" id="portal-exams-list">
                {currentExams.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-[#E5E2D9] rounded-2xl bg-[#F9F8F5]">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-[#5A5A40] text-sm font-bold">No exams available for your department at this moment.</p>
                  </div>
                ) : (
                  currentExams.map((ex) => {
                    const now = getSyncedTime();
                    const start = parseAsVietnamTime(ex.startTime);
                    const end = parseAsVietnamTime(ex.endTime);
                    
                    const isUpcoming = now < start;
                    const isExpired = now > end;
                    const isOngoing = !isUpcoming && !isExpired;

                    return (
                      <div 
                        key={ex.id}
                        onClick={() => !isExpired && handleSelectExam(ex)}
                        className={`relative border rounded-[16px] p-5 transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isExpired 
                            ? 'border-[#E5E2D9] opacity-65 bg-[#F9F8F5]/40 cursor-not-allowed'
                            : isUpcoming
                            ? 'border-[#E5E2D9] bg-white opacity-80 cursor-pointer hover:border-[#5A5A40]'
                            : 'border-[#E2DFD5] bg-white hover:border-[#5A5A40] hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        <div className="space-y-1 grow">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="font-bold text-[#1A1A1A] text-base font-serif">{ex.title}</h3>
                            <span className="bg-[#D4A373]/10 text-[#5A5A40] border border-[#D4A373]/25 text-[9px] uppercase font-bold px-2 py-0.5 rounded font-mono">
                              🎯 {lang === 'vi' ? 'Bộ phận áp dụng' : '対象部署'}: {ex.department && ex.department !== 'All' ? formatDept(ex.department, lang) : (lang === 'vi' ? 'Tất cả' : 'すべて')}
                            </span>
                            {ex.team && (
                              <span className="bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/25 text-[9px] uppercase font-bold px-2 py-0.5 rounded font-mono">
                                {lang === 'vi' ? 'Đội nhóm' : '対象チーム'}: {formatTeam(ex.team, lang)}
                              </span>
                            )}
                            {(() => {
                              const now = Date.now();
                              const start = new Date(ex.startTime).getTime();
                              const end = new Date(ex.endTime).getTime();
                              if (now < start) {
                                return (
                                  <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <span className="w-1 bg-slate-400 h-1 rounded-full"></span>
                                    {lang === 'vi' ? 'Sắp mở' : '配信予定'}
                                  </span>
                                );
                              } else if (now >= start && now <= end) {
                                const hoursRemaining = (end - now) / (1000 * 60 * 60);
                                if (hoursRemaining <= 24) {
                                  return (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse">
                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                                      {lang === 'vi' ? '🟡 Sắp đóng (<24h)' : 'まもなく終了'}
                                    </span>
                                  );
                                }
                                return (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                                    {lang === 'vi' ? '🟢 Đang mở' : '受検可能'}
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-250 text-[9px] uppercase font-extrabold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                    <span className="w-1 bg-rose-500 h-1 rounded-full"></span>
                                    {lang === 'vi' ? '🔴 Đã đóng' : '終了'}
                                  </span>
                                );
                              }
                            })()}
                          </div>
                          
                          <p className="text-[#5A5A40]/70 text-xs line-clamp-1">{ex.description || 'DYM Vietnam Assessment'}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#5A5A40]/65 pt-1 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#D4A373]" /> {ex.duration} {t.minutes}
                            </span>
                            <span>{t.startTime}: {formatDateTimeVietnamese(ex.startTime)}</span>
                            <span>{t.endTime}: {formatDateTimeVietnamese(ex.endTime)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center justify-end">
                          {isExpired ? (
                            <span className="text-slate-400 text-xs font-semibold">{t.expiredExam}</span>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center text-[#5A5A40] border border-[#E5E2D9]">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination controls for Exams (Requirement 3) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6" id="exams-pagination">
                  <button
                    disabled={examsPage === 1}
                    onClick={() => setExamsPage(prev => Math.max(1, prev - 1))}
                    className="p-1 px-2.5 bg-white border border-[#E5E2D9] hover:bg-slate-50 text-[#5A5A40] text-xs font-bold rounded-lg disabled:opacity-40 select-none cursor-pointer transition"
                  >
                    {lang === 'vi' ? 'Trước' : '前へ'}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setExamsPage(p)}
                      className={`w-7 h-7 text-xs font-bold rounded-full transition cursor-pointer ${
                        examsPage === p 
                          ? 'bg-[#5A5A40] text-white shadow-xs' 
                          : 'bg-white border border-[#E5E2D9] text-[#5A5A40] hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={examsPage === totalPages}
                    onClick={() => setExamsPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1 px-2.5 bg-white border border-[#E5E2D9] hover:bg-slate-50 text-[#5A5A40] text-xs font-bold rounded-lg disabled:opacity-40 select-none cursor-pointer transition"
                  >
                    {lang === 'vi' ? 'Tiếp' : '次へ'}
                  </button>
                </div>
              )}
            </div>

            {/* PERSONAL SECTION: PERSISTENT EXAM RESULTS MANAGEMENT (Requirement 3 - Collapsible) */}
            <div className="bg-white rounded-[24px] border border-[#E5E2D9] p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#F0EFEA] pb-4 mb-4 gap-4">
                <div className="space-y-0.5">
                  <h2 className="font-bold text-[#1A1A1A] text-sm font-serif flex items-center gap-2">
                    <Check className="w-4.5 h-4.5 text-[#5A5A40]" />
                    {lang === 'vi' ? 'LỊCH SỬ KẾT QUẢ THI CỦA BẠN' : '受検結果履歴'}
                  </h2>
                  <p className="text-xs text-[#5A5A40]/70 font-medium">
                    {lang === 'vi' ? 'Chỉ hiển thị lịch sử thi liên kết với tài khoản đang đăng nhập.' : '現在有効なアカウントに関連する受検履歴のみを表示しています。'}
                  </p>
                </div>
                <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
                  <div className="bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/25 text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0">
                    {mySubmissions.length} {lang === 'vi' ? 'kết quả được tìm thấy' : '件の受検履歴があります'}
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3.5 py-1.5 bg-[#5A5A40] hover:bg-[#4D4D36] text-white text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    {showHistory ? (lang === 'vi' ? 'Đóng lại' : '閉じる') : (lang === 'vi' ? 'Xem lịch sử' : '履歴を表示')}
                  </button>
                </div>
              </div>

              {showHistory && (
                <div className="space-y-4 animate-in fade-in duration-250">
                  {/* Advanced Search Filter Bar */}
                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={lang === 'vi' ? 'Nhập tên đề thi hoặc phòng ban để lọc lịch sử...' : '試験名または部署名を入力して履歴を検索...'}
                        className="w-full bg-[#FAF9F5] border border-[#E2DFD3] rounded-xl pl-4 pr-4 py-3 text-xs focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] font-bold"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {mySubmissions.length === 0 ? (
                    <div className="text-center py-12 text-[#5A5A40]/60 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      {lang === 'vi' ? 'Không tìm thấy hồ sơ lịch sử trùng khớp.' : '合致する受検履歴が見つかりません。'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#E5E2D9] text-[#5A5A40]/80 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-2">{lang === 'vi' ? 'Tên đề thi' : '試験名'}</th>
                            <th className="py-3 px-2 text-center">{t.scoreLabel}</th>
                            <th className="py-3 px-2 text-center">{lang === 'vi' ? 'Kết quả' : '結果'}</th>
                            <th className="py-3 px-2 text-center">{lang === 'vi' ? 'Thời gian' : '受検時間'}</th>
                            <th className="py-3 px-2 text-right">{t.submittedAt}</th>
                            <th className="py-3 px-2 text-right">{lang === 'vi' ? 'Hành động' : '操作'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mySubmissions.map((sub) => {
                            const rate = Math.round((sub.score / sub.maxScore) * 100) || 0;
                            const isPassed = rate >= 80;
                            return (
                              <tr key={sub.id} className="border-b border-[#F0EFEA] last:border-b-0 text-slate-800 hover:bg-[#F9F8F5]/50 transition font-bold">
                                <td className="py-3 px-2 text-[#1A1A1A] font-extrabold max-w-[200px] truncate">{sub.examTitle}</td>
                                <td className="py-3 px-2 text-center font-black text-[#5A5A40] text-sm">{sub.score} / {sub.maxScore} <span className="text-[10px] text-slate-400 font-normal">({rate}%)</span></td>
                                <td className="py-3 px-2 text-center">
                                  {isPassed ? (
                                    <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
                                      {lang === 'vi' ? 'ĐẬU' : '合格'}
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-extrabold px-2 py-0.5 rounded shadow-xs">
                                      {lang === 'vi' ? 'RỚT' : '不合格'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className="font-mono bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5 text-slate-600">
                                    {sub.timeTakenSeconds ? (
                                      lang === 'vi' 
                                        ? `${Math.floor(sub.timeTakenSeconds / 60)}p ${sub.timeTakenSeconds % 60}s`
                                        : `${Math.floor(sub.timeTakenSeconds / 60)}分 ${sub.timeTakenSeconds % 60}秒`
                                    ) : (
                                      lang === 'vi' ? 'Dưới 1 phút' : '1分未満'
                                    )}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right text-[#5A5A40]/75 font-medium text-[11px]">{formatDateTimeVietnamese(sub.submittedAt)}</td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => handleReviewSubmission(sub)}
                                    className="text-xs text-[#5A5A40] hover:text-[#1A1A1A] hover:underline font-bold cursor-pointer inline-flex items-center gap-1 bg-[#FAF9F5] hover:bg-white border border-[#E2DFD3] px-2.5 py-1.5 rounded-lg transition"
                                  >
                                    {t.reviewExamBtn}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Close layout at bottom */}
                  <div className="flex justify-end pt-3 border-t border-[#F0EFEA]">
                    <button
                      onClick={() => setShowHistory(false)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                    >
                      {lang === 'vi' ? 'Thu gọn danh sách' : '閉じる'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* FAQ EXPLAINING WHERE EXAM DATA GOES */}
            <div className="bg-[#FAF8F2] border border-[#EBE8DF] rounded-2xl p-5 text-left text-xs text-[#5A5A40] space-y-2">
              <span className="font-bold flex items-center gap-1.5 text-[#1A1A1A]">
                <HelpCircle className="w-4 h-4 text-[#D4A373]" />
                {t.resultWhereDoesItGoTitle}
              </span>
              <p className="leading-relaxed opacity-95">
                {t.resultWhereDoesItGoDesc}
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: MEMBER REGISTRATION PORTAL */}
        {screen === 'register' && selectedExam && (
          <div className="bg-white rounded-[24px] border border-[#E5E2D9] p-8 shadow-sm" id="screen-register">
            <button 
              onClick={() => setScreen('select-exam')}
              className="mb-5 inline-flex items-center gap-1 text-xs font-bold text-[#5A5A40] hover:text-[#1A1A1A] transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t.backToExamList}
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A] font-serif italic">{selectedExam.title}</h2>
              <p className="text-[#5A5A40]/70 text-xs mt-1 leading-relaxed">{selectedExam.description || 'Một bài thi chấm tự động chuẩn xác.'}</p>
              
              <div className="mt-4 flex items-center gap-2 bg-[#F9F8F5] border border-[#E5E2D9]/60 rounded-xl p-3.5 text-xs font-semibold text-[#5A5A40]">
                <Clock className="w-4 h-4 text-[#D4A373]" />
                <span>
                  {lang === 'vi' ? 'Thời gian làm bài:' : '制限時間:'} <strong>{selectedExam.duration} {t.minutes}</strong> • {lang === 'vi' ? 'Hạn đóng đề thi:' : '締切日時:'} <strong>{formatDateTimeVietnamese(selectedExam.endTime)}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <h3 className="font-bold text-[#1A1A1A] text-sm border-b border-[#E5E2D9] pb-2 font-serif">
                {lang === 'vi' ? 'Thông Tin Xác Nhận Thí Sinh' : '受験者情報の確認'}
              </h3>
              
              <div>
                <label className="block text-[#5A5A40] text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                  {lang === 'vi' ? 'Chọn Danh Tính Nhân Viên:' : '社員情報の選択:'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5A5A40]/60 absolute left-3 top-3.5 z-10" />
                  <select
                    required
                    className="w-full bg-[#F9F8F5] border border-[#E5E2D9] rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:border-[#5A5A40] focus:ring-1 focus:ring-[#5A5A40] font-bold cursor-pointer"
                    value={employeeEmail}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      if (!selectedVal) {
                        setEmployeeName('');
                        setEmployeeEmail('');
                        setEmployeeDepartment('');
                        setEmployeeTeam('');
                      } else {
                        const found = membersList.find(m => m.email.toLowerCase().trim() === selectedVal.toLowerCase().trim());
                        if (found) {
                          setEmployeeName(found.name);
                          setEmployeeEmail(found.email);
                          setEmployeeDepartment(found.department || '');
                          setEmployeeTeam(found.team || '');
                        }
                      }
                    }}
                  >
                    <option value="">{lang === 'vi' ? '-- Chọn tên của bạn --' : '-- 名前を選択してください --'}</option>
                    {[...membersList].sort((a, b) => a.name.localeCompare(b.name)).map((m) => (
                      <option key={m.id} value={m.email}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#5A5A40] text-[11px] font-bold mb-1.5 uppercase tracking-wider">{t.employeeEmail}:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5A5A40]/60 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    readOnly
                    placeholder={lang === 'vi' ? 'Địa chỉ Email tự động điền' : 'メールアドレスは自動入力されます'}
                    className="w-full bg-[#F5F2EA] border border-[#E5E2D9] rounded-xl pl-9 pr-3 py-3 text-sm text-[#5A5A40]/80 font-bold outline-none cursor-not-allowed select-none"
                    value={employeeEmail}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#5A5A40] text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                    {lang === 'vi' ? 'Bộ Phận Làm Việc:' : '所属部署:'}
                  </label>
                  <select
                    required
                    disabled
                    className="w-full bg-[#F5F2EA] border border-[#E5E2D9] rounded-xl px-3.5 py-3 text-xs text-[#5A5A40]/80 font-bold cursor-not-allowed outline-none select-none"
                    value={employeeDepartment}
                  >
                    <option value="">{lang === 'vi' ? '-- Bộ phận tự động điền --' : '-- 部署は自動入力されます --'}</option>
                    {departmentsList.map(dept => (
                      <option key={dept} value={dept}>{formatDept(dept, lang)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#5A5A40] text-[11px] font-bold mb-1.5 uppercase tracking-wider">
                    {lang === 'vi' ? 'Đội Nhóm (Team):' : '所属チーム:'}
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full bg-[#F5F2EA] border border-[#E5E2D9] rounded-xl px-3.5 py-3 text-xs text-[#5A5A40]/80 font-bold cursor-not-allowed outline-none select-none"
                    value={employeeTeam ? formatTeam(employeeTeam, lang) : (lang === 'vi' ? 'Chưa phân nhóm / チーム未分類' : 'チーム未分類 / Chưa phân nhóm')}
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#5A5A40]/55 mt-1.5 border-t border-slate-100 pt-1.2">
                {lang === 'vi' ? 'Hệ thống tự động xác định bộ phận và đội nhóm của bạn dựa trên hồ sơ.' : '選択されたプロファイルに基づいて、部署およびチームが自動的に入力されます。'}
              </p>

              <button
                type="submit"
                className="w-full py-3 bg-[#5A5A40] text-white rounded-xl font-bold text-sm tracking-wide shadow-sm hover:bg-[#4D4D36] transition flex items-center justify-center gap-1 cursor-pointer mt-4"
                id="btn-enter-exam"
              >
                {lang === 'vi' ? 'Xác Nhận & Bắt Đầu Làm Bài' : '確認して受検を開始する'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: "CHƯA ĐẾN GIỜ LÀM BÀI" WAITING SCREEN */}
        {screen === 'waiting-room' && selectedExam && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center" id="screen-waiting-room">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 border border-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-[#1A1A1A] font-serif italic">
               Chưa Đến Giờ Làm Bài
            </h2>
            <p className="text-slate-500 text-xs mt-2 max-w-md mx-auto leading-relaxed">
              You are currently in the Waiting Lobby. The examination "{selectedExam.title}" will open precisely at:
            </p>

            <div className="my-6 inline-block bg-slate-50 border border-slate-200 rounded-xl px-6 py-4">
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{t.startTime}</div>
              <div className="text-base font-extrabold text-[#5A5A40] mt-1">{formatDateTimeVietnamese(selectedExam.startTime)}</div>
              {waitingCountdown && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block mb-0.5">
                    Automatic countdown:
                  </span>
                  <span className="text-xl font-mono font-black text-rose-600 animate-pulse">{waitingCountdown}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setScreen('select-exam')}
                className="px-5 py-2 bg-[#5A5A40]/10 hover:bg-[#5A5A40]/25 transition rounded-lg text-xs font-bold text-[#5A5A40] cursor-pointer"
              >
                {t.backToExamList}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ACTIVE EXAMINATION TIME - COUNTDOWN TIMER (CORE CRITERIA) */}
        {screen === 'active-test' && selectedExam && (
          <div className="bg-white rounded-[24px] border border-[#E5E2D9] shadow-sm relative overflow-hidden w-full" id="screen-active-test">
            
            {/* Countdown Floating Bar - Natural Tones theme styling */}
            <div className="bg-[#5A5A40] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10 shadow-sm animate-in slide-in-from-top-4 duration-300">
              <div>
                <span className="text-[9px] bg-[#D4A373]/30 text-[#FDFBF7] font-bold px-2 py-0.5 rounded uppercase tracking-widest font-mono">Active Session</span>
                <h3 className="font-bold text-[#FDFBF7] text-sm mt-1 line-clamp-1 font-serif">{selectedExam.title}</h3>
                <p className="text-[10px] text-[#E5E2D9]/85">
                  {lang === 'vi' ? 'Thí sinh: ' : '受験者: '}{employeeName} ({employeeEmail}) • {formatDept(employeeDepartment, lang)}{employeeTeam ? ` / ${formatTeam(employeeTeam, lang)}` : ''}
                </p>
              </div>

              {/* TIMER CRUCIAL MODULE */}
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-[#FDFBF7]">
                <Clock className="w-5 h-5 shrink-0 animate-pulse text-[#D4A373]" />
                <div className="leading-none text-right font-mono">
                  <span className="block text-[8px] font-bold text-[#E5E2D9]">{t.timerRemaining}</span>
                  <span className="text-lg font-black" id="countdown-timer">{formatTime(secondsRemaining)}</span>
                </div>
              </div>
            </div>

            {/* Exam Content list */}
            <div className="p-6 sm:p-8 space-y-8" id="active-exam-questions">
              {selectedExam.questions.map((q, idx) => {
                const isSelectedList = Array.isArray(answers[q.id]) ? (answers[q.id] as number[]) : [];

                return (
                  <div key={q.id} className="border-b border-[#F0EFEA] pb-6 last:border-b-0 last:pb-0" id={`question-box-${q.id}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="bg-[#5A5A40] text-white text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-[#1A1A1A] text-sm leading-relaxed whitespace-pre-wrap">
                          {q.text} <span className="text-xs font-semibold text-slate-500 normal-case ml-1">({q.points} {t.points})</span>
                        </h4>
                        <span className="text-[10px] bg-[#F9F8F5] border border-[#E5E2D9] text-[#5A5A40] font-extrabold px-2.5 py-0.5 rounded-md mt-1.5 inline-block uppercase">
                          {q.type === 'single' 
                            ? t.singleChoiceDesc 
                            : q.type === 'multiple' 
                            ? t.multiChoiceDesc 
                            : (lang === 'vi' ? 'Tự luận' : '記述式')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 max-w-2xl pl-8">
                      {q.type === 'essay' ? (
                        <textarea
                          placeholder={lang === 'vi' ? 'Nhập câu trả lời tự luận của bạn tại đây...' : 'ここに記述式の回答を入力してください...'}
                          className="w-full min-h-[120px] bg-white border border-[#E5E2D9] focus:border-[#5A5A40] rounded-xl p-4 text-xs font-medium text-[#1A1A1A] outline-none resize-y"
                          value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                          onChange={(e) => handleEssayChange(q.id, e.target.value)}
                        />
                      ) : (
                        q.options.map((option, optIdx) => {
                          const isChecked = isSelectedList.includes(optIdx);

                          return (
                            <div 
                              key={optIdx}
                              onClick={() => handleSelectOption(q.id, q.type, optIdx)}
                              className={`border rounded-xl p-3.5 items-center gap-3 cursor-pointer transition flex justify-between ${
                                isChecked 
                                  ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#1A1A1A] font-medium' 
                                  : 'border-[#E5E2D9] bg-white text-slate-700 hover:border-[#D4A373] hover:bg-[#F9F8F5]/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Custom Radio/Checkbox Visual elements */}
                                {q.type === 'single' ? (
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    isChecked ? 'border-[#5A5A40] bg-[#5A5A40]' : 'border-[#E5E2D9] bg-white'
                                  }`}>
                                    {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                  </div>
                                ) : (
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    isChecked ? 'border-[#5A5A40] bg-[#5A5A40]' : 'border-[#E5E2D9] bg-white'
                                  }`}>
                                    {isChecked && <CheckCircle className="w-3 h-3 text-white stroke-[3px]" />}
                                  </div>
                                )}
                                <span className="text-sm leading-relaxed whitespace-pre-wrap">{option}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Action Block */}
            <div className="p-6 bg-[#F9F8F5] border-t border-[#E5E2D9] flex justify-end">
              <button
                type="button"
                onClick={handleManualSubmit}
                className="px-6 py-2.5 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4D4D36] font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                id="btn-submit-exam"
              >
                <Send className="w-4 h-4" />
                {t.btnSubmit}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: DETAILED RESULTS TRANSCRIPT & SYNCHRONOUS FEEDBACK (AUTO-GRADED) */}
        {screen === 'result' && finalSubmission && selectedExam && (
          <div className="bg-white rounded-[24px] border border-[#E5E2D9] p-8 shadow-sm text-center animate-in zoom-in-95 duration-300 w-full" id="screen-result">
            <div className="w-16 h-16 bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/25 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-[#1A1A1A] font-serif italic">{t.transcriptTitle}!</h2>
            <p className="text-[#5A5A40]/75 text-xs mt-1">
              {lang === 'vi' ? 'Bài thi của bạn đã được đối soát và chấm điểm tự động ngay lập tức!' : '答案用紙は即座に解析され、自動採点が行われました！'}
            </p>

            {/* Score circle badge */}
            <div className="my-6 inline-block bg-[#F9F8F5] border border-[#E5E2D9] rounded-[24px] px-10 py-6 text-center">
              <div className="text-[10px] text-[#5A5A40]/60 font-bold uppercase tracking-widest">{t.scoreLabel}</div>
              <div className="text-4xl font-black text-[#5A5A40] mt-1.5 leading-none font-serif italic">
                {finalSubmission.score} <span className="text-sm font-medium text-[#5A5A40]/50">/ {finalSubmission.maxScore}</span>
              </div>
              <div className="text-[11px] font-bold text-[#5A5A40] mt-3 bg-[#5A5A40]/10 px-4 py-1.5 rounded-full inline-block">
                {t.accuracyLabel}: {Math.round((finalSubmission.score / finalSubmission.maxScore) * 100) || 0}%
              </div>
            </div>

            {/* Info details checklist */}
            <div className="max-w-md mx-auto space-y-2 border border-[#E5E2D9] rounded-2xl p-4 bg-[#F9F8F5]/30 text-left text-xs mb-6 font-medium">
              <div className="flex justify-between bg-transparent py-1 border-b border-[#F0EFEA]">
                <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Nhân viên:' : '社員氏名:'}</span>
                <span className="font-extrabold text-[#1A1A1A]">{finalSubmission.employeeName}</span>
              </div>
              <div className="flex justify-between bg-transparent py-1 border-b border-[#F0EFEA]">
                <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Email:' : 'メールアドレス:'}</span>
                <span className="font-semibold text-[#1A1A1A]">{finalSubmission.employeeEmail}</span>
              </div>
              <div className="flex justify-between bg-transparent py-1 border-b border-[#F0EFEA]">
                <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Phòng ban:' : '配属部門:'}</span>
                <span className="font-extrabold text-[#1A1A1A]">{formatDept(finalSubmission.employeeDepartment || '', lang) || 'N/A'}</span>
              </div>
              {finalSubmission.employeeTeam && (
                <div className="flex justify-between bg-transparent py-1 border-b border-[#F0EFEA]">
                  <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Đội nhóm:' : '所属チーム:'}</span>
                  <span className="font-extrabold text-[#1A1A1A]">{formatTeam(finalSubmission.employeeTeam, lang)}</span>
                </div>
              )}
              <div className="flex justify-between bg-transparent py-1 border-b border-[#F0EFEA]">
                <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Đề thi:' : '試験名:'}</span>
                <span className="font-bold text-[#1A1A1A] truncate max-w-[200px]">{finalSubmission.examTitle}</span>
              </div>
              <div className="flex justify-between bg-transparent py-1">
                <span className="text-[#5A5A40]/70">{lang === 'vi' ? 'Thời gian làm bài:' : '試験時間:'}</span>
                <span className="font-extrabold text-[#5A5A40]">
                  {finalSubmission.timeTakenSeconds ? (
                    lang === 'vi' ? (
                      `${Math.floor(finalSubmission.timeTakenSeconds / 60)} phút ${finalSubmission.timeTakenSeconds % 60} giây`
                    ) : (
                      `${Math.floor(finalSubmission.timeTakenSeconds / 60)}分 ${finalSubmission.timeTakenSeconds % 60}秒`
                    )
                  ) : (
                    lang === 'vi' ? 'Dưới 1 phút' : '1分未満'
                  )}
                </span>
              </div>
            </div>

            {/* Sheets connection report */}
            {isSyncingSheet && (
              <div className="mb-6 text-xs text-[#5A5A40] flex items-center justify-center gap-1.5 animate-pulse bg-[#F9F8F5] py-2.5 rounded-xl border border-[#E5E2D9]">
                <Clock className="w-4 h-4 animate-spin" />
                {lang === 'vi' ? 'Đang tự động đồng bộ kết quả lên Google Sheets của DYM Vietnam...' : 'DYMベトナムのGoogleスプレッドシートに自動同期中...'}
              </div>
            )}
            {sheetsUrl && !isSyncingSheet && sheetSyncSuccess !== null && (
              <div className={`mb-6 text-xs flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border ${
                sheetSyncSuccess 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {sheetSyncSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <strong>
                      {lang === 'vi' ? 'Đồng bộ kết quả lên Google Sheets thành công!' : 'Googleスプレッドシートへの同期が正常に完了しました！'}
                    </strong>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <strong>
                      {lang === 'vi' ? 'Đồng bộ đang chờ để xử lý. Kết quả đã được lưu tạm an toàn trong phiên làm việc này.' : '同期キュー追加：テスト結果はブラウザセッション内に安全に一時保存されました。'}
                    </strong>
                  </>
                )}
              </div>
            )}

            {/* Detailed questions review transcript */}
            <div className="my-8 text-left space-y-4 border-t border-[#F0EFEA] pt-6">
              <h3 className="font-bold text-[#1A1A1A] text-sm font-serif">
                {lang === 'vi' ? 'Chi tiết đáp án & Điểm thành phần:' : '回答詳細と配点:'}
              </h3>
              {selectedExam.questions.map((q, idx) => {
                const userSelected = finalSubmission.answers[q.id];
                const isEssay = q.type === 'essay';
                const correct = q.correctAnswers || [];
                const matches = isEssay
                  ? true
                  : Array.isArray(userSelected) && userSelected.length === correct.length && userSelected.every(v => correct.includes(v));

                return (
                  <div key={q.id} className="border border-[#E5E2D9] rounded-xl p-4 bg-[#F9F8F5]/25">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-[#1A1A1A] whitespace-pre-wrap">
                        <strong>{lang === 'vi' ? `Câu hỏi ${idx + 1}:` : `問${idx + 1}:`}</strong> {q.text}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                        isEssay
                          ? 'bg-[#5A5A40]/10 text-[#5A5A40] border border-[#5A5A40]/20'
                          : matches ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {isEssay
                          ? (lang === 'vi' ? 'Tự luận' : '記述式')
                          : matches 
                            ? (lang === 'vi' ? 'Đúng' : '正解') 
                            : (lang === 'vi' ? 'Sai' : '不正解')
                        }
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 pl-4 border-l-2 border-[#E5E2D9]">
                      {isEssay ? (
                        <div className="text-xs">
                          <span className="text-[10px] text-slate-400 font-bold block mb-1">
                            {lang === 'vi' ? 'Câu trả lời của bạn:' : 'あなたの回答:'}
                          </span>
                          <p className="bg-white border border-[#E5E2D9] rounded-lg p-3 text-slate-700 whitespace-pre-wrap font-medium">
                            {typeof userSelected === 'string' ? userSelected : (lang === 'vi' ? '(Chưa trả lời)' : '(未回答)')}
                          </p>
                        </div>
                      ) : (
                        q.options.map((opt, optIdx) => {
                          const userSelectedArr = Array.isArray(userSelected) ? userSelected : [];
                          const isChosen = userSelectedArr.includes(optIdx);
                          const isCorrectOpt = correct.includes(optIdx);

                          let appearance = 'text-slate-600 text-sm';
                          if (isChosen && isCorrectOpt) {
                            appearance = 'text-emerald-700 font-bold flex items-center gap-1.5';
                          } else if (isChosen && !isCorrectOpt) {
                            appearance = 'text-rose-600 font-bold flex items-center gap-1.5';
                          } else if (!isChosen && isCorrectOpt) {
                            appearance = 'text-[#5A5A40] font-bold flex items-center gap-1.5';
                          }

                          return (
                            <div key={optIdx} className="text-sm py-0.5 flex flex-wrap items-center gap-2">
                              <span className={`${appearance} whitespace-pre-wrap`}>{opt}</span>
                              <div className="flex gap-1 text-[8px] font-bold">
                                {isChosen && <span className="bg-[#5A5A40]/10 border border-[#5A5A40]/20 px-1 py-0.2 rounded text-[#5A5A40]">
                                  {t.userSelected}
                                </span>}
                                {isCorrectOpt && <span className="bg-emerald-50 border border-emerald-150 px-1 py-0.2 rounded text-emerald-700">
                                  {t.correctAnswer}
                                </span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Back button */}
            <button
              onClick={handleExitResult}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#5A5A40] hover:bg-[#4D4D36] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backToExamList}
            </button>
          </div>
        )}

      </div>

      {/* CUSTOM CONFIRM SUBMISSION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="confirm-submit-modal">
          <div className="bg-white rounded-2xl border border-[#E5E2D9] max-w-sm w-full p-6 space-y-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 border border-amber-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 font-serif">
                {lang === 'vi' ? 'Xác Nhận Nộp Bài Thi' : '提出を確定する'}
              </h3>
              <p className="text-xs text-[#5A5A40] leading-relaxed font-semibold">
                {t.confirmSubmitMessage}
              </p>
            </div>

            <div className="flex gap-3 justify-center text-xs pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 border border-[#E5E2D9] rounded-lg text-[#5A5A40] hover:bg-slate-50 transition font-extrabold cursor-pointer flex-1"
              >
                {lang === 'vi' ? 'Hủy' : 'キャンセル'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  performSubmission(false);
                }}
                className="px-4 py-2.5 bg-[#5A5A40] hover:bg-[#4D4D36] text-white font-extrabold rounded-lg transition cursor-pointer flex-1"
              >
                {lang === 'vi' ? 'Xác nhận nộp' : '提出を確定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
