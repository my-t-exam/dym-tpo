/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Check, Info, Filter, Calendar, User, BookOpen, RotateCcw } from 'lucide-react';
import { Submission } from '../types';

interface GasExportProps {
  submissions: Submission[];
  lang: 'vi' | 'ja';
}

export default function GasExport({ submissions = [], lang = 'vi' }: GasExportProps) {
  const [exported, setExported] = useState(false);

  // Filter States
  const [selectedExamTitle, setSelectedExamTitle] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract unique options dynamically from active submissions
  const uniqueExams = Array.from(new Set(submissions.map(s => s.examTitle))).sort();
  const uniqueDepts = Array.from(new Set(submissions.map(s => s.employeeDepartment).filter(Boolean))).sort();

  // Reset Filters helper
  const handleResetFilters = () => {
    setSelectedExamTitle('');
    setSelectedDepartment('');
    setSearchEmployeeQuery('');
    setStartDate('');
    setEndDate('');
  };

  // Perform filtration in real-time
  const filteredSubmissions = submissions.filter(sub => {
    // 1. Filter by Exam Title
    if (selectedExamTitle && sub.examTitle !== selectedExamTitle) {
      return false;
    }

    // 2. Filter by Department
    if (selectedDepartment && (sub.employeeDepartment || '').toLowerCase().trim() !== selectedDepartment.toLowerCase().trim()) {
      return false;
    }

    // 3. Filter by Employee Name / Email (substring search)
    if (searchEmployeeQuery) {
      const query = searchEmployeeQuery.toLowerCase().trim();
      const nameMatch = (sub.employeeName || '').toLowerCase().trim().includes(query);
      const emailMatch = (sub.employeeEmail || '').toLowerCase().trim().includes(query);
      if (!nameMatch && !emailMatch) {
        return false;
      }
    }

    // 4. Filter by Date range (compare using subDate yyyy-mm-dd)
    if (startDate || endDate) {
      if (!sub.submittedAt) return false;
      const subDateStr = sub.submittedAt.slice(0, 10); // yields "YYYY-MM-DD" or similar

      if (startDate && subDateStr < startDate) {
        return false;
      }
      if (endDate && subDateStr > endDate) {
        return false;
      }
    }

    return true;
  });

  const handleExportCSV = () => {
    const listToExport = filteredSubmissions;
    if (listToExport.length === 0) {
      alert(lang === 'vi' ? 'Không có kết quả thi nào khớp với bộ lọc để xuất!' : 'フィルター条件に一致する受検データがありません。');
      return;
    }

    // Define CSV Headers
    const headers = lang === 'vi' 
      ? ["Thời Gian Nộp", "Họ Tên", "Email", "Bộ Phận", "Đề Thi", "Điểm Số", "Điểm Tối Đa", "Tỉ Lệ Đạt %", "Thời Gian Làm Bài", "Cách Thức Nộp"]
      : ["提出日時", "氏名", "メールアドレス", "所属部署", "試験名", "獲得スコア", "最大スコア", "正解率 %", "解答時間", "提出方法"];

    // Format rows
    const rows = listToExport.map(sub => {
      const rate = Math.round((sub.score / sub.maxScore) * 100) || 0;
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

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-4xl mx-auto" id="csv-export-container">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg font-serif">
            {lang === 'vi' ? 'Xuất Đường Dẫn / Kết Quả Ra CSV' : '受検結果データCSVエクスポート'}
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            {lang === 'vi' 
              ? 'Tải về toàn bộ danh sách kết quả thi, điểm số và thông tin chi tiết của nhân viên dưới dạng file CSV tiêu chuẩn (UTF-8 có mã BOM cho Excel).' 
              : '社員の受検時間、スコア、合否状況をExcel対応のUTF-8-BOMコード付き標準CSVファイル形式で出力・保存します。'}
          </p>
        </div>
        
        <button
          onClick={handleExportCSV}
          disabled={filteredSubmissions.length === 0}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
            exported
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-[#5A5A40] hover:bg-[#4D4D36] text-white shadow-xs'
          }`}
          id="btn-download-csv"
        >
          {exported ? (
            <>
              <Check className="w-4 h-4 animate-bounce" />
              {lang === 'vi' ? 'Đã Xuất File Thành Công!' : 'エクスポート完了！'}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {lang === 'vi' ? `Tải Về File CSV (${filteredSubmissions.length})` : `CSVダウンロード (${filteredSubmissions.length}件)`}
            </>
          )}
        </button>
      </div>

      {/* FILTER PANEL SECTION */}
      <div className="bg-[#FAF9F5] border border-slate-150 rounded-xl p-5 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#5A5A40]" />
            <span>{lang === 'vi' ? 'Bộ lọc xuất dữ liệu' : 'エクスポート抽出条件'}</span>
          </div>
          {(selectedExamTitle || selectedDepartment || searchEmployeeQuery || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {lang === 'vi' ? 'Xóa bộ lọc' : '条件をクリア'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter by Exam */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-slate-400" />
              {lang === 'vi' ? 'Lọc theo đề thi:' : '試験名で絞り込み:'}
            </label>
            <select
              value={selectedExamTitle}
              onChange={(e) => setSelectedExamTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition text-slate-700"
            >
              <option value="">-- {lang === 'vi' ? 'Tất cả đề kiểm tra' : 'すべての試験問題'} --</option>
              {uniqueExams.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>

          {/* Filter by Department */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {lang === 'vi' ? 'Lọc theo bộ phận:' : '部署で絞り込み:'}
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-[#5A5A40] font-bold cursor-pointer transition text-slate-700"
            >
              <option value="">-- {lang === 'vi' ? 'Tất cả bộ phận' : 'すべての部署'} --</option>
              {uniqueDepts.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Search by Name/Email */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {lang === 'vi' ? 'Tìm theo cá nhân:' : '社員氏名・メールで検索:'}
            </label>
            <input
              type="text"
              value={searchEmployeeQuery}
              onChange={(e) => setSearchEmployeeQuery(e.target.value)}
              placeholder={lang === 'vi' ? 'Nhập tên hoặc email...' : '氏名またはメールを入力...'}
              className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-[#5A5A40] font-bold transition text-slate-700"
            />
          </div>

          {/* Date from */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {lang === 'vi' ? 'Nộp từ ngày:' : '提出開始日:'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-[#5A5A40] font-bold transition text-slate-700 cursor-pointer"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {lang === 'vi' ? 'Nộp đến ngày:' : '提出終了日:'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-[#5A5A40] font-bold transition text-slate-700 cursor-pointer"
            />
          </div>

          {/* Summary badge */}
          <div className="md:col-span-1 flex flex-col justify-end">
            <div className="bg-slate-100 border border-slate-200 rounded-lg p-2 px-3 text-center text-slate-600 font-bold text-xs flex items-center justify-between">
              <span>{lang === 'vi' ? 'Bộ lọc khớp:' : '検索一致:'}</span>
              <span className="text-sm font-extrabold text-[#5A5A40] font-serif italic">
                {filteredSubmissions.length} / {submissions.length} {lang === 'vi' ? 'lượt' : '件'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
            {lang === 'vi' ? 'Số Lượt Thi Dự Kiến Xuất' : 'エクスポート対象件数'}
          </span>
          <span className="text-2xl font-black text-[#5A5A40] block mt-1 font-serif italic">
            {filteredSubmissions.length}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
            {lang === 'vi' ? 'Điểm Trung Bình (Đã Lọc)' : '平均蓄積スコア (抽出)'}
          </span>
          <span className="text-2xl font-black text-[#5A5A40] block mt-1 font-serif italic">
            {filteredSubmissions.length > 0
              ? (filteredSubmissions.reduce((acc, curr) => acc + curr.score, 0) / filteredSubmissions.length).toFixed(1)
              : '0.0'}
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl text-center">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
            {lang === 'vi' ? 'Định Dạng Tải Xuống' : 'ダウンロード形式'}
          </span>
          <span className="text-sm font-black text-slate-700 block mt-2 font-mono uppercase">
            CSV (UTF-8 WITH BOM)
          </span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-2">
        <div className="flex items-center gap-2 font-bold text-blue-800">
          <Info className="w-4 h-4 text-blue-500" />
          <span>{lang === 'vi' ? 'Lưu ý khi mở tệp Excel:' : 'Excelに関する注意点:'}</span>
        </div>
        <p className="pl-6 text-[11px] text-blue-900 leading-relaxed">
          {lang === 'vi'
            ? 'Tệp tin tải xuống đã được cấu hình với chuẩn Byte Order Mark (BOM). Bạn có thể nhấp đúp trực tiếp để mở trong Microsoft Excel hoặc import trực tiếp vào Google Trang tính mà không lo bị lỗi hiển thị các ký tự tiếng Việt / tiếng Nhật.'
            : 'ダウンロードされたCSVはUTF-8(BOM付き)形式のため、ExcelやGoogleスプレッドシートで文字レイアウト崩れや文字化けなしでそのままダブルクリックして閲覧可能です。'}
        </p>
      </div>

      {filteredSubmissions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 block mb-3 animate-pulse">
            {lang === 'vi' ? 'Bản xem trước dữ liệu xuất (tối đa 5 hàng đầu khớp bộ lọc):' : 'エクスポートプレビュー (条件一致分、先頭最大5行):'}
          </span>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-[11px] border-collapse bg-slate-50">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-bold">
                  <th className="p-2 py-1.5">{lang === 'vi' ? 'Nhân viên' : '氏名'}</th>
                  <th className="p-2 py-1.5">{lang === 'vi' ? 'Bộ phận' : '所属'}</th>
                  <th className="p-2 py-1.5">{lang === 'vi' ? 'Đề thi' : '試験'}</th>
                  <th className="p-2 py-1.5 text-center">{lang === 'vi' ? 'Điểm' : '点数'}</th>
                  <th className="p-2 py-1.5 text-right">{lang === 'vi' ? 'Thời gian nộp' : '提出日時'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredSubmissions.slice(0, 5).map(sub => (
                  <tr key={sub.id} className="text-slate-600 font-medium">
                    <td className="p-2 py-1.5 font-bold text-slate-800">{sub.employeeName}</td>
                    <td className="p-2 py-1.5">{sub.employeeDepartment || 'N/A'}</td>
                    <td className="p-2 py-1.5 truncate max-w-[150px]">{sub.examTitle}</td>
                    <td className="p-2 py-1.5 text-center font-bold text-[#5A5A40]">{sub.score} / {sub.maxScore}</td>
                    <td className="p-2 py-1.5 text-right text-slate-400 font-mono text-[10px]">
                      {new Date(sub.submittedAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'ja-JP')} {sub.submittedAt.slice(11, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
