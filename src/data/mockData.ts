/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam } from '../types';

// Helper to get formatted date-time string relative to now
const getRelativeDateTime = (hoursOffset: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hoursOffset);
  d.setMinutes(0);
  d.setSeconds(0);
  // Format as YYYY-MM-DDTHH:mm
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const sampleExams: Exam[] = [
  {
    id: 'exam-cybersecurity-2026',
    title: 'Kiểm Tra An Toàn Thông Tin Nội Bộ 2026',
    description: 'Hệ thống đánh giá kiến thức cơ bản về an toàn bảo mật thông tin tài khoản, phòng chống lừa đảo trực tuyến (phishing) và quy chế sử dụng tài nguyên công ty.',
    startTime: getRelativeDateTime(-1), // already started 1 hr ago
    endTime: getRelativeDateTime(24),   // ends tomorrow
    duration: 15, // 15 minutes
    department: 'All',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        text: 'Đâu là dấu hiệu nhận biết một email lừa đảo (phishing)? (Chọn câu trả lời đúng nhất)',
        type: 'single',
        options: [
          'Email từ đồng nghiệp yêu cầu chia sẻ file công việc thông thường.',
          'Địa chỉ email người gửi có tên miền lạ (ví dụ: hr-dymvietnam@gmails.com), nội dung khẩn cấp thúc giục nhấp vào link lạ hoặc khai báo mật khẩu.',
          'Email tự động thông báo cập nhật lịch họp hàng tuần từ Google Calendar.',
          'Email thông báo nhận lương của bộ phận nhân sự chính thức của công ty.'
        ],
        correctAnswers: [1],
        points: 4
      },
      {
        id: 'q2',
        text: 'Nên làm gì khi phát hiện máy tính cá nhân làm việc bị nhiễm mã độc (virus)?',
        type: 'single',
        options: [
          'Không làm gì cả vì phần mềm diệt virus sẽ tự xử lý toàn bộ.',
          'Tắt máy tính, ngắt ngay kết nối Internet/Wifi và thông báo ngay đến bộ phận Hỗ trợ Kỹ thuật (IT Admin) của công ty.',
          'Tiếp tục làm việc và tải thêm ứng dụng dọn rác trực tuyến không rõ nguồn gốc.',
          'Tự động sao lưu toàn bộ dữ liệu ra USB rồi mang sang cắm nhờ máy tính đồng nghiệp.'
        ],
        correctAnswers: [1],
        points: 3
      },
      {
        id: 'q3',
        text: 'Các quy định bảo mật mật khẩu tài khoản nội bộ nào sau đây là BẮT BUỘC? (Chọn TẤT CẢ các đáp án đúng)',
        type: 'multiple',
        options: [
          'Độ dài mật khẩu tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
          'Có thể viết mật khẩu ra giấy note rồi dán lên màn hình máy tính cho dễ nhớ.',
          'Không chia sẻ mật khẩu tài khoản làm việc cho bất kỳ ai, kể cả đồng nghiệp hay quản lý.',
          'Sử dụng chung một mật khẩu cho cả tài khoản công việc lẫn mạng xã hội cá nhân (Facebook, Gmail).'
        ],
        correctAnswers: [0, 2],
        points: 3
      }
    ]
  },
  {
    id: 'exam-code-of-conduct',
    title: 'Khảo Sát Quy Tắc Ứng Xử & Văn Hóa Doanh Nghiệp',
    description: 'Bài đánh giá định kỳ giúp nhân viên nắm rõ chuẩn mực ứng xử chuyên nghiệp với khách hàng, đối tác và đồng nghiệp tại nơi làm việc.',
    startTime: getRelativeDateTime(2), // Starts in 2 hours
    endTime: getRelativeDateTime(10),  // Ends in 10 hours
    duration: 10,
    department: 'All',
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'cc-q1',
        text: 'Khi giao tiếp với khách hàng qua email, quy trình phản hồi chuẩn của doanh nghiệp yêu cầu:',
        type: 'single',
        options: [
          'Thích lúc nào phản hồi lúc đó, không giới hạn thời gian.',
          'Phản hồi lịch sự, đúng trọng tâm và tối đa trong vòng 24 giờ làm việc kể từ khi nhận được email.',
          'Chỉ cần nhắn tin zalo cá nhân là đủ, không cần trả lời email.',
          'Chuyển tiếp trực tiếp cho phòng nhân sự trả lời.'
        ],
        correctAnswers: [1],
        points: 5
      },
      {
        id: 'cc-q2',
        text: 'Hành vi nào dưới đây THỂ HIỆN tinh thần tôn trọng đồng nghiệp?',
        type: 'single',
        options: [
          'Lắng nghe ý kiến trái chiều, thảo luận văn minh mang tính xây dựng tại cuộc họp.',
          'Nói chuyện riêng gây mất trật tự trong phòng làm việc chung.',
          'Đổ lỗi cho người khác khi tiến độ công việc chung bị chậm trễ.',
          'Sử dụng thông tin cá nhân của đồng nghiệp để trêu đùa.'
        ],
        correctAnswers: [0],
        points: 5
      }
    ]
  }
];
