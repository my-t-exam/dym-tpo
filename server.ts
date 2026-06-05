import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_PATH = path.join(process.cwd(), "db.json");

const defaultMembers = [
  {
    id: "m1",
    name: "Takahashi Kenji",
    email: "takahashi.kenji@dymvietnam.net",
    role: "superadmin",
    department: "IT部",
    password: "dym123",
    createdAt: new Date().toISOString()
  },
  {
    id: "m-user",
    name: "LY TIEU MY",
    email: "my-t@dymvietnam.net",
    role: "superadmin",
    department: "IT部",
    password: "dym123",
    createdAt: new Date().toISOString()
  },
  {
    id: "m2",
    name: "Nguyen Chi Thanh",
    email: "thanh.nc@dymvietnam.net",
    role: "admin",
    department: "IT部",
    password: "dym123",
    createdAt: new Date().toISOString()
  },
  {
    id: "m3",
    name: "Yoko Yamada",
    email: "yamada.yoko@dymvietnam.net",
    role: "admin",
    department: "事務代行",
    password: "dym123",
    createdAt: new Date().toISOString()
  },
  {
    id: "m4",
    name: "Nguyen Thi Lan",
    email: "lan.nt@dymvietnam.net",
    role: "admin",
    department: "人事部",
    password: "dym123",
    createdAt: new Date().toISOString()
  },
  {
    id: "m5",
    name: "Trần Thị Mai",
    email: "mai.tt@dymvietnam.net",
    role: "member",
    department: "事務代行",
    createdAt: new Date().toISOString()
  },
  {
    id: "m6",
    name: "Lê Văn Hoàng",
    email: "hoang.lv@dymvietnam.net",
    role: "member",
    department: "人事部",
    createdAt: new Date().toISOString()
  },
  {
    id: "m7",
    name: "Kazuto Sato",
    email: "sato.kazuto@dymvietnam.net",
    role: "member",
    department: "マーケティング部",
    createdAt: new Date().toISOString()
  }
];

const sampleExams = [
  {
    id: "exam-cybersecurity-2026",
    title: "Kiểm Tra An Toàn Thông Tin Nội Bộ 2026",
    description: "Hệ thống đánh giá kiến thức cơ bản về an toàn bảo mật thông tin tài khoản, phòng chống lừa đảo trực tuyến (phishing) và quy chế sử dụng tài nguyên công ty.",
    startTime: new Date(Date.now() - 3600000).toISOString().substring(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().substring(0, 16),
    duration: 15,
    department: "All",
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: "q1",
        text: "Đâu là dấu hiệu nhận biết một email lừa đảo (phishing)? (Chọn câu trả lời đúng nhất)",
        type: "single",
        options: [
          "Email từ đồng nghiệp yêu cầu chia sẻ file công việc thông thường.",
          "Địa chỉ email người gửi có tên miền lạ (ví dụ: hr-dymvietnam@gmails.com), nội dung khẩn cấp thúc giục nhấp vào link lạ hoặc khai báo mật khẩu.",
          "Email tự động thông báo cập nhật lịch họp hàng tuần từ Google Calendar.",
          "Email thông báo nhận lương của bộ phận nhân sự chính thức của công ty."
        ],
        correctAnswers: [1],
        points: 4
      },
      {
        id: "q2",
        text: "Nên làm gì khi phát hiện máy tính cá nhân làm việc bị nhiễm mã độc (virus)?",
        type: "single",
        options: [
          "Không làm gì cả vì phần mềm diệt virus sẽ tự xử lý toàn bộ.",
          "Tắt máy tính, ngắt ngay kết nối Internet/Wifi và thông báo ngay đến bộ phận Hỗ trợ Kỹ thuật (IT Admin) của công ty.",
          "Tiếp tục làm việc và tải thêm ứng dụng dọn rác trực tuyến không rõ nguồn gốc.",
          "Tự động sao lưu toàn bộ dữ liệu ra USB rồi mang sang cắm nhờ máy tính đồng nghiệp."
        ],
        correctAnswers: [1],
        points: 3
      },
      {
        id: "q3",
        text: "Các quy định bảo mật mật khẩu tài khoản nội bộ nào sau đây là BẮT BUỘC? (Chọn TẤT CẢ các đáp án đúng)",
        type: "multiple",
        options: [
          "Độ dài mật khẩu tối thiểu 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
          "Có thể viết mật khẩu ra giấy note rồi dán lên màn hình máy tính cho dễ nhớ.",
          "Không chia sẻ mật khẩu tài khoản làm việc cho bất kỳ ai, kể cả đồng nghiệp hay quản lý.",
          "Sử dụng chung một mật khẩu cho cả tài khoản công việc lẫn mạng xã hội cá nhân (Facebook, Gmail)."
        ],
        correctAnswers: [0, 2],
        points: 3
      }
    ]
  },
  {
    id: "exam-code-of-conduct",
    title: "Khảo Sát Quy Tắc Ứng Xử & Văn Hóa Doanh Nghiệp",
    description: "Bài đánh giá định kỳ giúp nhân viên nắm rõ chuẩn mực ứng xử chuyên nghiệp với khách hàng, đối tác và đồng nghiệp tại nơi làm việc.",
    startTime: new Date(Date.now() + 7200000).toISOString().substring(0, 16),
    endTime: new Date(Date.now() + 36000000).toISOString().substring(0, 16),
    duration: 10,
    department: "All",
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: "cc-q1",
        text: "Khi giao tiếp với khách hàng qua email, quy trình phản hồi chuẩn của doanh nghiệp yêu cầu:",
        type: "single",
        options: [
          "Thích lúc nào phản hồi lúc đó, không giới hạn thời gian.",
          "Phản hồi lịch sự, đúng trọng tâm và tối đa trong vòng 24 giờ làm việc kể từ khi nhận được email.",
          "Chỉ cần nhắn tin zalo cá nhân là đủ, không cần trả lời email.",
          "Chuyển tiếp trực tiếp cho phòng nhân sự trả lời."
        ],
        correctAnswers: [1],
        points: 5
      },
      {
        id: "cc-q2",
        text: "Hành vi nào dưới đây THỂ HIỆN tinh thần tôn trọng đồng nghiệp?",
        type: "single",
        options: [
          "Lắng nghe ý kiến trái chiều, thảo luận văn minh mang tính xây dựng tại cuộc họp.",
          "Nói chuyện riêng gây mất trật tự trong phòng làm việc chung.",
          "Đổ lỗi cho người khác khi tiến độ công việc chung bị chậm trễ.",
          "Sử dụng thông tin cá nhân của đồng nghiệp để trêu đùa."
        ],
        correctAnswers: [0],
        points: 5
      }
    ]
  }
];

const defaultDepartments = ["事務代行", "マーケティング部", "IT部", "デザイン部", "人事部"];

const defaultTeams = {
  "IT部": ["Development", "Infra", "QA"],
  "マーケティング部": ["Growth", "Content"],
  "デザイン部": ["UI/UX", "Branding"],
  "人事部": ["HR", "Recruiting"],
  "事務代行": ["Admin Support"]
};

// Seed db if missing
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    exams: sampleExams,
    submissions: [],
    sheetsUrl: "",
    members: defaultMembers,
    departments: defaultDepartments,
    teams: defaultTeams
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), "utf-8");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API 1: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API 2: Get whole DB
  app.get("/api/db", (req, res) => {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return res.json({
          exams: sampleExams,
          submissions: [],
          sheetsUrl: "",
          members: defaultMembers,
          departments: defaultDepartments,
          teams: defaultTeams
        });
      }
      const data = fs.readFileSync(DB_PATH, "utf-8");
      res.json(JSON.parse(data));
    } catch (err) {
      console.error("Error reading database file", err);
      res.status(500).json({ error: "Failed to read database" });
    }
  });

  // API 3: Overwrite DB
  app.post("/api/db", (req, res) => {
    try {
      const newData = req.body;
      if (!newData) {
        return res.status(400).json({ error: "No payload provided" });
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(newData, null, 2), "utf-8");
      res.json({ success: true });
    } catch (err) {
      console.error("Error writing database file", err);
      res.status(500).json({ error: "Failed to save database" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
