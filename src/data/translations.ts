/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const translations = {
  vi: {
    // Top Bar & Identity Simulator
    portalTitle: "HỆ THỐNG KIỂM TRA TPO DYM VIỆT NAM",
    subBranding: "DYM Vietnam • Bảng Đánh Giá Tự Động Toàn Diện",
    identitySelectorLabel: "CHUYỂN ĐỔI TÀI KHOẢN THỬ NGHIỆM (MOCK LAB):",
    roleLabel: "Vai trò",
    deptLabel: "Phòng ban",
    langLabel: "Ngôn ngữ",
    switchRoleSuccess: "Đã thiết lập tài khoản thử nghiệm thành công: ",
    noExams: "Hiện tại không có đề thi nào phù hợp cho bạn hoặc đã hết thời gian hiệu lực.",
    examReady: "Có thể làm",
    upcomingExam: "Sắp diễn ra",
    expiredExam: "Đã đóng",
    takeExamBtn: "Bắt đầu làm bài",
    backToExamList: "Quay lại danh sách đề",
    
    // Member Screen Translation Headers
    notAllowedAdmin: "Bạn không có quyền truy cập cổng Quản trị này. Vui lòng chuyển đổi vai trò ở góc trên thành Admin hoặc Super Admin.",
    memberPortalHeader: "Cổng Phân Tích Đánh Giá Nhân Viên",
    memberPortalSub: "Hoàn thành các khảo sát trực tuyến, xem lịch sử làm bài cá nhân và kiểm tra phản hồi tự động.",
    personalHistory: "Lịch Sử Làm Bài Cá Nhân",
    yourSubmissions: "Danh sách bài thi đã nộp của bạn",
    noHistory: "Bạn chưa thực hiện bài thi nào trên hệ thống.",
    scoreLabel: "Điểm số",
    accuracyLabel: "Tỉ lệ chính xác",
    submittedAt: "Thời gian nộp",
    examStatusSubmitted: "Đã nộp",
    isAutoSubmitted: "Tự động nộp bài (Hết giờ)",
    reviewExamBtn: "Xem lại đáp án",
    
    // Auth & Identity Descriptions
    superadminDesc: "Quyền Super Admin: Xem/Sửa mọi thứ, cấp/thu hồi quyền quản trị bộ phận, quản lý cấu hình đồng bộ Google Sheets.",
    adminDesc: "Quyền Admin: Tạo/Sửa đề thi, câu hỏi, cấu hình khung giờ làm bài, quản lý danh sách nhân viên của bộ phận, duyệt kết quả thi chi tiết.",
    memberDesc: "Quyền Nhân viên: Tham gia thi khảo sát TPO định kỳ, xem lịch sử điểm của bản thân và nhật ký câu trả lời đúng/sai.",
    
    // Exam Taking Portal
    examTakingTitle: "Phiên làm bài thi trực tuyến đang mở",
    questionLabel: "Câu hỏi",
    singleChoiceDesc: "Chọn một đáp án đúng",
    multiChoiceDesc: "Chọn nhiều đáp án đúng",
    points: "điểm",
    timerRemaining: "Thời gian còn lại",
    confirmSubmitTitle: "Xác nhận nộp bài",
    confirmSubmitMessage: "Bạn có chắc chắn muốn nộp bài thi ngay bây giờ không? Điểm số sẽ được chấm và lưu tự động ngay lập tức.",
    btnSubmit: "Nộp Bài Trực Tuyến",
    warningAutoSubmit: "Đang tự động nộp bài do hết giờ làm bài!",
    
    // Sync Mechanism & Results
    resultWhereDoesItGoTitle: "Kết quả thi khảo sát sẽ được đồng bộ đi đâu?",
    resultWhereDoesItGoDesc: "Lời giải của bạn được lưu trữ an toàn trong kho dữ liệu cục bộ. Đồng thời, nếu phòng ban của bạn có bật đồng bộ Google Sheets, kết quả thi và phân tích phân phối điểm số sẽ tự động đồng bộ theo thời gian thực lên Trang tính của doanh nghiệp.",
    sheetSyncedSuccess: "Đồng bộ trực tiếp lên Google Sheet thành công!",
    sheetSyncedLocalSaved: "Mạng bận. Đã lưu trữ an toàn trong tệp chờ cục bộ.",
    syncWithSheetBtn: "Đồng bộ lên Trang tính",
    
    // Admin & Super Admin Dashboard
    adminTitle: "Cổng Quản Trị Hệ Thống",
    adminSubTitle: "",
    quickStats: "Thống Kê Khái Quát",
    totalExams: "Đề thi hiện có",
    totalSubmissions: "Lượt thi đã nộp",
    averageScore: "Điểm trung bình (Thang điểm 10)",
    activeMembers: "Nhân viên đăng ký",
    
    // Tab Headers in Admin
    tabExams: "Đề thi",
    tabSubmissions: "Danh Sách Kết Quả",
    tabMembers: "Phân Quyền bộ phận",
    tabSheets: "Xuất tệp Excel/CSV",
    
    // Admin actions
    btnCreateExam: "Tạo Đề Thi Mới",
    btnSaveConfig: "Lưu Cấu Hình",
    btnDiscard: "Hủy Thay Đổi",
    btnSaveAndLaunch: "Lưu & Ban Hành Đề Thi",
    btnEditExam: "Chỉnh sửa đề",
    btnDeleteExam: "Xóa đề thi",
    btnPromoteAdmin: "Thăng cấp quản trị viên",
    btnDemoteAdmin: "Hủy tư cách quản trị",
    btnDeleteMember: "Xóa nhân viên",
    btnAddMember: "Thêm nhân viên mới",
    
    // Language Specific Text
    langVi: "Tiếng Việt",
    langJa: "日本語 (Tiếng Nhật)",
    
    // Specific Labels
    startTime: "Thời gian mở",
    endTime: "Thời gian đóng",
    duration: "Thời lượng bài thi",
    minutes: "phút",
    totalQuestions: "Số lượng câu hỏi",
    examDescription: "Mô tả đề thi",
    examTitle: "Tiêu Đề Đề Thi",
    actions: "Thao tác",
    status: "Trạng thái",
    searchPlaceholder: "Tìm kiếm theo Tên hoặc địa chỉ Email...",
    filterDepartment: "Theo Phòng ban",
    filterExam: "Theo Đề thi",
    allExams: "Tất cả Đề thi",
    allDepts: "Tất cả Phòng ban",
    
    // Member Fields
    employeeName: "Họ và Tên Nhân viên",
    employeeEmail: "Email Công ty",
    employeeDept: "Phòng ban làm việc",
    joinedAt: "Ngày đăng ký",
    roleType: "Quyền hạn truy cập",
    saveSuccess: "Cập nhật hệ thống thành công!",
    confirmDelete: "Bạn có chắc chắn muốn xóa không? Hành động này không thể hoàn tác.",
    
    // Result Transcript detail
    transcriptTitle: "KẾT QUẢ ĐIỂM SỐ CHI TIẾT",
    correctAnswer: "Đáp án đúng",
    userSelected: "Lựa chọn của bạn",
    pointsAwarded: "Điểm số đạt",
    zeroPoints: "0 điểm"
  },
  ja: {
    // Top Bar & Identity Simulator
    portalTitle: "DYMベトナム TPOテストシステム",
    subBranding: "DYM Vietnam • 総合自動評価パネル",
    identitySelectorLabel: "シミュレーションアカウント切替（開発テスト用）:",
    roleLabel: "ロール (職能)",
    deptLabel: "部門",
    langLabel: "言語",
    switchRoleSuccess: "シミュレーションアカウントの設定に成功しました： ",
    noExams: "現在、あなたの部門向けの試験がないか、または実施可能時間外です。",
    examReady: "受験可能",
    upcomingExam: "開始予定",
    expiredExam: "終了",
    takeExamBtn: "試験を開始する",
    backToExamList: "試験一覧に戻る",
    
    // Member Screen Translation Headers
    notAllowedAdmin: "管理ポータルへのアクセス権限がありません。上部のシミュレーターで管理者に切り替えてください。",
    memberPortalHeader: "社員評価ポータル",
    memberPortalSub: "オンライン適性テストの実施、個人成績履歴の照会、および自動フィードバック結果を確認できます。",
    personalHistory: "あなたの個人受験履歴",
    yourSubmissions: "提出済みのテスト結果記録一覧",
    noHistory: "システム上に未受験または受験履歴がありません。",
    scoreLabel: "得点",
    accuracyLabel: "正答率",
    submittedAt: "提出日時",
    examStatusSubmitted: "提出済み",
    isAutoSubmitted: "自動提出 (時間切れ)",
    reviewExamBtn: "回答内容を確認する",
    
    // Auth & Identity Descriptions
    superadminDesc: "スーパー管理者権限：すべての閲覧・編集、部門管理者の指定・取消、Googleスプレッドシート連携管理。",
    adminDesc: "管理者権限：試験・設問の作成・編集、スケジュール・制限時間調整、所属社員の管理、提出データの確認。",
    memberDesc: "社員権限：テストの受験、自身の得点とフィードバックログの確認。",
    
    // Exam Taking Portal
    examTakingTitle: "オンライン試験実施中",
    questionLabel: "問",
    singleChoiceDesc: "単一選択",
    multiChoiceDesc: "複数選択",
    points: "点",
    timerRemaining: "残り時間",
    confirmSubmitTitle: "提出の確認",
    confirmSubmitMessage: "本当に試験を提出してよろしいですか？得点はすぐに自動算出・記録されます。",
    btnSubmit: "オンラインで回答を提出",
    warningAutoSubmit: "制限時間になりましたので自動提出します！",
    
    // Sync Mechanism & Results
    resultWhereDoesItGoTitle: "テスト結果はどこに同期されますか？",
    resultWhereDoesItGoDesc: "回答データは安全なローカルデータベースに保存されます。さらに、部門でGoogleスプレッドシートへの同期が有効な場合、成績と回答内容がリアルタイムに直接同期されます。",
    sheetSyncedSuccess: "Googleスプレッドシートへリアルタイム同期しました！",
    sheetSyncedLocalSaved: "通信ビジー：ローカルのデータセットに保存されました。",
    syncWithSheetBtn: "スプレッドシートに同期",
    
    // Admin & Super Admin Dashboard
    adminTitle: "管理ポータル",
    adminSubTitle: "",
    quickStats: "概観統計情報",
    totalExams: "作成済み試験",
    totalSubmissions: "提出された受験件数",
    averageScore: "平均得点 (10点満点換算)",
    activeMembers: "登録済み社員数",
    
    // Tab Headers in Admin
    tabExams: "試験問題管理",
    tabSubmissions: "受験結果一覧",
    tabMembers: "権限とグループ",
    tabSheets: "CSVエクスポート",
    
    // Admin actions
    btnCreateExam: "新規試験を作成",
    btnSaveConfig: "設定を保存",
    btnDiscard: "変更を破棄",
    btnSaveAndLaunch: "保存して公開リリース",
    btnEditExam: "問題を編集する",
    btnDeleteExam: "試験を削除する",
    btnPromoteAdmin: "管理者に昇格",
    btnDemoteAdmin: "管理者から降格",
    btnDeleteMember: "社員を削除",
    btnAddMember: "新規メンバー登録",
    
    // Language Specific Text
    langVi: "Tiếng Việt (ベトナム語)",
    langJa: "日本語 (Tiếng Nhật)",
    
    // Specific Labels
    startTime: "開始日時",
    endTime: "終了日時",
    duration: "制限時間",
    minutes: "分",
    totalQuestions: "設問数",
    examDescription: "試験の説明",
    examTitle: "試験名",
    actions: "操作",
    status: "状態",
    searchPlaceholder: "お名前またはEmailアドレスで検索...",
    filterDepartment: "部門で絞り込み",
    filterExam: "対象テストで絞り込み",
    allExams: "すべての試験",
    allDepts: "すべての部門",
    
    // Member Fields
    employeeName: "社員氏名",
    employeeEmail: "メールアドレス",
    employeeDept: "配属部門",
    joinedAt: "登録日",
    roleType: "権限職能",
    saveSuccess: "システム情報の保存に成功しました！",
    confirmDelete: "削除してもよろしいですか？この操作は取り消せません。",
    
    // Result Transcript detail
    transcriptTitle: "受験結果成績表詳細",
    correctAnswer: "正解",
    userSelected: "あなたの解答",
    pointsAwarded: "得点",
    zeroPoints: "0点"
  }
};
