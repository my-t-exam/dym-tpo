/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, Submission, Member, Language, AuditLog } from '../types';
import { sampleExams } from '../data/mockData';

const EXAMS_KEY = 'employee_testing_exams';
const SUBMISSIONS_KEY = 'employee_testing_submissions';
const SHEETS_URL_KEY = 'employee_testing_sheets_url';
const MEMBERS_KEY = 'employee_testing_members';
const LANGUAGE_KEY = 'employee_testing_language';
const AUDIT_LOGS_KEY = 'employee_testing_audit_logs';

// Centralized dynamic server-synced memory cache
let dbMemoryCache = {
  exams: [] as Exam[],
  submissions: [] as Submission[],
  sheetsUrl: '',
  members: [] as Member[],
  departments: [] as string[],
  teams: {} as Record<string, string[]>,
  auditLogs: [] as AuditLog[]
};

let isInitialized = false;
let lastPushTime = 0;

const pushToBackend = async () => {
  lastPushTime = Date.now();
  
  if (!isInitialized) {
    console.warn('Skipping sync: database is not initialized yet.');
    return;
  }
  
  // Strict safety check: Never push if the cache states are completely empty
  if (dbMemoryCache.members.length === 0 || dbMemoryCache.exams.length === 0) {
    console.warn('Skipping sync: Safety guard triggered to prevent overwriting server database with empty lists.');
    return;
  }

  try {
    const res = await fetch(`/api/db?t=${Date.now()}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify(dbMemoryCache)
    });
    if (!res.ok) {
      console.error('Failed to sync to shared database API:', res.statusText);
    }
  } catch (error) {
    console.error('Failed to sync to shared database API:', error);
  }
};

let isInitializingPromise: Promise<void> | null = null;

export const initSharedDatabase = async (forceUpdate: boolean = false): Promise<void> => {
  if (isInitialized && !forceUpdate) {
    if (Date.now() - lastPushTime < 4000) {
      // Race protection: Skip background pull immediately after a local manual save
      return;
    }
    // If already fully initialized, fetch newer updates from server directly as part of a background sync
    try {
      const res = await fetch(`/api/db?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.exams) && Array.isArray(data.members)) {
          dbMemoryCache.exams = data.exams;
          dbMemoryCache.submissions = Array.isArray(data.submissions) ? data.submissions : [];
          dbMemoryCache.sheetsUrl = data.sheetsUrl || '';
          dbMemoryCache.members = data.members;
          dbMemoryCache.departments = Array.isArray(data.departments) ? data.departments : dbMemoryCache.departments;
          dbMemoryCache.teams = (data.teams && typeof data.teams === 'object') ? data.teams : dbMemoryCache.teams;
          dbMemoryCache.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

          localStorage.setItem(MEMBERS_KEY, JSON.stringify(dbMemoryCache.members));
          localStorage.setItem(EXAMS_KEY, JSON.stringify(dbMemoryCache.exams));
          localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(dbMemoryCache.submissions));
          localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(dbMemoryCache.departments));
          localStorage.setItem(TEAMS_KEY, JSON.stringify(dbMemoryCache.teams));
          localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(dbMemoryCache.auditLogs));
          if (dbMemoryCache.sheetsUrl) {
            localStorage.setItem(SHEETS_URL_KEY, dbMemoryCache.sheetsUrl);
          }
        }
      }
    } catch (e) {
      console.error('Failed to update shared cache in background:', e);
    }
    return;
  }

  if (isInitializingPromise) {
    return isInitializingPromise;
  }

  isInitializingPromise = (async () => {
    // 1. Populate dbMemoryCache from localStorage baseline first to guarantee non-empty data immediately
    try {
      const rawMembers = localStorage.getItem(MEMBERS_KEY);
      dbMemoryCache.members = rawMembers ? JSON.parse(rawMembers) : defaultMembers;
    } catch {
      dbMemoryCache.members = defaultMembers;
    }

    try {
      const rawExams = localStorage.getItem(EXAMS_KEY);
      dbMemoryCache.exams = rawExams ? JSON.parse(rawExams) : sampleExams;
    } catch {
      dbMemoryCache.exams = sampleExams;
    }

    try {
      const rawSubs = localStorage.getItem(SUBMISSIONS_KEY);
      dbMemoryCache.submissions = rawSubs ? JSON.parse(rawSubs) : [];
    } catch {
      dbMemoryCache.submissions = [];
    }

    try {
      const rawAudit = localStorage.getItem(AUDIT_LOGS_KEY);
      dbMemoryCache.auditLogs = rawAudit ? JSON.parse(rawAudit) : [];
    } catch {
      dbMemoryCache.auditLogs = [];
    }

    try {
      const rawDepts = localStorage.getItem(DEPARTMENTS_KEY);
      dbMemoryCache.departments = rawDepts ? JSON.parse(rawDepts) : defaultDepartments;
    } catch {
      dbMemoryCache.departments = defaultDepartments;
    }

    try {
      const rawTeams = localStorage.getItem(TEAMS_KEY);
      dbMemoryCache.teams = rawTeams ? JSON.parse(rawTeams) : {
        'IT部': ['Development', 'Infra', 'QA'],
        'マーケティング部': ['Growth', 'Content'],
        'デザイン部': ['UI/UX', 'Branding'],
        '人事部': ['HR', 'Recruiting'],
        '事務代行': ['Admin Support']
      };
    } catch {
      dbMemoryCache.teams = {};
    }

    try {
      dbMemoryCache.sheetsUrl = localStorage.getItem(SHEETS_URL_KEY) || '';
    } catch {
      dbMemoryCache.sheetsUrl = '';
    }

    // 2. Fetch the cloud server data as the single source of truth
    try {
      const res = await fetch(`/api/db?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        
        if (data && Array.isArray(data.exams) && Array.isArray(data.members)) {
          dbMemoryCache.exams = data.exams;
          dbMemoryCache.submissions = Array.isArray(data.submissions) ? data.submissions : [];
          dbMemoryCache.sheetsUrl = data.sheetsUrl || '';
          dbMemoryCache.members = data.members;
          dbMemoryCache.departments = Array.isArray(data.departments) ? data.departments : dbMemoryCache.departments;
          dbMemoryCache.teams = (data.teams && typeof data.teams === 'object') ? data.teams : dbMemoryCache.teams;
          dbMemoryCache.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
        }

        // Ensure LY TIEU MY superadmin is present in the cache
        let updatedMembers = false;
        const index = dbMemoryCache.members.findIndex(m => m.email.toLowerCase().trim() === 'my-t@dymvietnam.net');
        if (index >= 0) {
          if (dbMemoryCache.members[index].name !== 'LY TIEU MY' || dbMemoryCache.members[index].role !== 'superadmin') {
            dbMemoryCache.members[index].name = 'LY TIEU MY';
            dbMemoryCache.members[index].role = 'superadmin';
            updatedMembers = true;
          }
          if (!dbMemoryCache.members[index].password) {
            dbMemoryCache.members[index].password = 'dym123';
            updatedMembers = true;
          }
        } else {
          dbMemoryCache.members.push({
            id: 'm-user-lytieumy',
            name: 'LY TIEU MY',
            email: 'my-t@dymvietnam.net',
            role: 'superadmin',
            department: 'IT部',
            password: 'dym123',
            createdAt: new Date().toISOString()
          });
          updatedMembers = true;
        }

        // Write updated caches back to localStorage
        localStorage.setItem(MEMBERS_KEY, JSON.stringify(dbMemoryCache.members));
        localStorage.setItem(EXAMS_KEY, JSON.stringify(dbMemoryCache.exams));
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(dbMemoryCache.submissions));
        localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(dbMemoryCache.departments));
        localStorage.setItem(TEAMS_KEY, JSON.stringify(dbMemoryCache.teams));
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(dbMemoryCache.auditLogs));
        if (dbMemoryCache.sheetsUrl) {
          localStorage.setItem(SHEETS_URL_KEY, dbMemoryCache.sheetsUrl);
        }

        // Temporarily set isInitialized to true before push to bypass block
        isInitialized = true;

        // If we modified client-side defaults, push back to server DB
        if (updatedMembers) {
          await pushToBackend();
        }
      }
    } catch (error) {
      console.error('Failed to connect to shared database API, running with offline baseline:', error);
    } finally {
      isInitialized = true;
      isInitializingPromise = null;
    }
  })();

  return isInitializingPromise;
};

export const defaultMembers: Member[] = [
  {
    id: 'm1',
    name: 'Takahashi Kenji',
    email: 'takahashi.kenji@dymvietnam.net',
    role: 'superadmin',
    department: 'IT部',
    password: 'dym123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm-user',
    name: 'LY TIEU MY',
    email: 'my-t@dymvietnam.net',
    role: 'superadmin',
    department: 'IT部',
    password: 'dym123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm2',
    name: 'Nguyen Chi Thanh',
    email: 'thanh.nc@dymvietnam.net',
    role: 'admin',
    department: 'IT部',
    password: 'dym123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm3',
    name: 'Yoko Yamada',
    email: 'yamada.yoko@dymvietnam.net',
    role: 'admin',
    department: '事務代行',
    password: 'dym123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm4',
    name: 'Nguyen Thi Lan',
    email: 'lan.nt@dymvietnam.net',
    role: 'admin',
    department: '人事部',
    password: 'dym123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm5',
    name: 'Trần Thị Mai',
    email: 'mai.tt@dymvietnam.net',
    role: 'member',
    department: '事務代行',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm6',
    name: 'Lê Văn Hoàng',
    email: 'hoang.lv@dymvietnam.net',
    role: 'member',
    department: '人事部',
    createdAt: new Date().toISOString()
  },
  {
    id: 'm7',
    name: 'Kazuto Sato',
    email: 'sato.kazuto@dymvietnam.net',
    role: 'member',
    department: 'マーケティング部',
    createdAt: new Date().toISOString()
  }
];

export const getStoredMembers = (): Member[] => {
  if (!isInitialized || dbMemoryCache.members.length === 0) {
    try {
      const raw = localStorage.getItem(MEMBERS_KEY);
      if (raw) {
        dbMemoryCache.members = JSON.parse(raw);
      } else {
        dbMemoryCache.members = defaultMembers;
      }
    } catch {
      dbMemoryCache.members = defaultMembers;
    }
  }

  // Ensure all superadmins & admins have 'dym123' password if none is set
  let updated = false;
  dbMemoryCache.members = dbMemoryCache.members.map(m => {
    if ((m.role === 'superadmin' || m.role === 'admin') && !m.password) {
      updated = true;
      return { ...m, password: 'dym123' };
    }
    return m;
  });

  // PROACTIVE PATCH: Ensure LY TIEU MY exists and has Super Admin role
  const index = dbMemoryCache.members.findIndex(m => m.email.toLowerCase().trim() === 'my-t@dymvietnam.net');
  if (index >= 0) {
    if (dbMemoryCache.members[index].name !== 'LY TIEU MY' || dbMemoryCache.members[index].role !== 'superadmin') {
      dbMemoryCache.members[index].name = 'LY TIEU MY';
      dbMemoryCache.members[index].role = 'superadmin';
      updated = true;
    }
    if (!dbMemoryCache.members[index].password) {
      dbMemoryCache.members[index].password = 'dym123';
      updated = true;
    }
  } else {
    dbMemoryCache.members.push({
      id: 'm-user-lytieumy',
      name: 'LY TIEU MY',
      email: 'my-t@dymvietnam.net',
      role: 'superadmin',
      department: 'IT部',
      password: 'dym123',
      createdAt: new Date().toISOString()
    });
    updated = true;
  }

  if (updated) {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(dbMemoryCache.members));
    pushToBackend();
  }
  return dbMemoryCache.members;
};

const DEPARTMENTS_KEY = 'employee_testing_departments';
export const defaultDepartments = ['事務代行', 'マーケティング部', 'IT部', 'デザイン部', '人事部'];

export const getStoredDepartments = (): string[] => {
  if (!isInitialized || dbMemoryCache.departments.length === 0) {
    try {
      const raw = localStorage.getItem(DEPARTMENTS_KEY);
      if (raw) {
        dbMemoryCache.departments = JSON.parse(raw);
      } else {
        dbMemoryCache.departments = defaultDepartments;
      }
    } catch {
      dbMemoryCache.departments = defaultDepartments;
    }
  }

  if (dbMemoryCache.departments.includes('業務部') || dbMemoryCache.departments.includes('総務人事部') || dbMemoryCache.departments.length === 4) {
    dbMemoryCache.departments = defaultDepartments;
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(defaultDepartments));
    pushToBackend();
  }
  return dbMemoryCache.departments;
};

export const saveDepartments = (depts: string[]) => {
  dbMemoryCache.departments = depts;
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(depts));
  pushToBackend();
};

const TEAMS_KEY = 'employee_testing_dept_teams';
export const getStoredTeams = (): Record<string, string[]> => {
  if (!isInitialized || Object.keys(dbMemoryCache.teams).length === 0) {
    try {
      const raw = localStorage.getItem(TEAMS_KEY);
      if (raw) {
        dbMemoryCache.teams = JSON.parse(raw);
      } else {
        const defaultTeams: Record<string, string[]> = {
          'IT部': ['Development', 'Infra', 'QA'],
          'マーケティング部': ['Growth', 'Content'],
          'デザイン部': ['UI/UX', 'Branding'],
          '人事部': ['HR', 'Recruiting'],
          '事務代行': ['Admin Support']
        };
        dbMemoryCache.teams = defaultTeams;
      }
    } catch {
      dbMemoryCache.teams = {};
    }
  }
  return dbMemoryCache.teams;
};

export const saveStoredTeams = (teams: Record<string, string[]>) => {
  dbMemoryCache.teams = teams;
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  pushToBackend();
};

export const saveMembers = (members: Member[]) => {
  dbMemoryCache.members = members;
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  pushToBackend();
};

export const getStoredLanguage = (): Language => {
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    return (raw === 'ja' || raw === 'vi') ? raw as Language : 'vi';
  } catch {
    return 'vi';
  }
};

export const saveLanguage = (lang: Language) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (e) {
    console.error('Error saving language', e);
  }
};

export const getStoredExams = (): Exam[] => {
  if (!isInitialized || dbMemoryCache.exams.length === 0) {
    try {
      const raw = localStorage.getItem(EXAMS_KEY);
      if (raw) {
        dbMemoryCache.exams = JSON.parse(raw);
      } else {
        dbMemoryCache.exams = sampleExams;
      }
    } catch {
      dbMemoryCache.exams = sampleExams;
    }
  }
  return dbMemoryCache.exams;
};

export const saveExams = (exams: Exam[]) => {
  dbMemoryCache.exams = exams;
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  pushToBackend();
};

export const getStoredSubmissions = (): Submission[] => {
  if (!isInitialized || dbMemoryCache.submissions.length === 0) {
    try {
      const raw = localStorage.getItem(SUBMISSIONS_KEY);
      if (raw) {
        dbMemoryCache.submissions = JSON.parse(raw);
      } else {
        dbMemoryCache.submissions = [];
      }
    } catch {
      dbMemoryCache.submissions = [];
    }
  }
  return dbMemoryCache.submissions;
};

export const saveSubmissions = (submissions: Submission[]) => {
  dbMemoryCache.submissions = submissions;
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  pushToBackend();
};

export const getStoredAuditLogs = (): AuditLog[] => {
  if (!isInitialized || dbMemoryCache.auditLogs.length === 0) {
    try {
      const raw = localStorage.getItem(AUDIT_LOGS_KEY);
      if (raw) {
        dbMemoryCache.auditLogs = JSON.parse(raw);
      } else {
        dbMemoryCache.auditLogs = [];
      }
    } catch {
      dbMemoryCache.auditLogs = [];
    }
  }
  return dbMemoryCache.auditLogs;
};

export const saveAuditLogs = (logs: AuditLog[]) => {
  dbMemoryCache.auditLogs = logs;
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  pushToBackend();
};

export const addAuditLog = (action: string, actorName: string, actorEmail: string, details: string) => {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    actorName,
    actorEmail,
    details,
    timestamp: new Date().toISOString()
  };
  const logs = [newLog, ...getStoredAuditLogs()];
  const limitedLogs = logs.slice(0, 150);
  saveAuditLogs(limitedLogs);
};

export const getStoredSheetsUrl = (): string => {
  if (!isInitialized || !dbMemoryCache.sheetsUrl) {
    try {
      dbMemoryCache.sheetsUrl = localStorage.getItem(SHEETS_URL_KEY) || '';
    } catch {
      dbMemoryCache.sheetsUrl = '';
    }
  }
  return dbMemoryCache.sheetsUrl;
};

export const saveSheetsUrl = (url: string) => {
  dbMemoryCache.sheetsUrl = url;
  localStorage.setItem(SHEETS_URL_KEY, url);
  pushToBackend();
};

/**
 * Autogrades a submission and returns the score
 */
export const calculateScore = (exam: Exam, answers: Record<string, number[] | string>): { score: number; maxScore: number } => {
  let score = 0;
  let maxScore = 0;

  exam.questions.forEach((q) => {
    maxScore += q.points;
    const selected = answers[q.id];

    if (q.type === 'single') {
      const selArr = Array.isArray(selected) ? selected : [];
      const correct = q.correctAnswers || [];
      // Single choice must match exactly
      if (selArr.length === 1 && correct.length === 1 && selArr[0] === correct[0]) {
        score += q.points;
      }
    } else if (q.type === 'multiple') {
      const selArr = Array.isArray(selected) ? selected : [];
      const correct = q.correctAnswers || [];
      // Multiple choice: must match exactly all selected choices
      if (selArr.length === correct.length && selArr.every(v => correct.includes(v))) {
        score += q.points;
      }
    } else if (q.type === 'essay') {
      // Essay questions are graded manually (automatically counted as 0 points initially)
    }
  });

  return { score, maxScore };
};

/**
 * Sends a submission record to Google Sheets via the GAS Web App URL
 */
export const syncWithGoogleSheets = async (gasUrl: string, submission: Submission): Promise<boolean> => {
  if (!gasUrl || !gasUrl.startsWith('http')) {
    return false;
  }

  try {
    // Standard Google Apps Script Web App post request uses redirection, 
    // so we can use navigator.sendBeacon or standard fetch with no-cors / cors.
    const payload = {
      submittedAt: submission.submittedAt,
      examTitle: submission.examTitle,
      employeeName: submission.employeeName,
      employeeEmail: submission.employeeEmail,
      score: submission.score,
      maxScore: submission.maxScore,
      isAutoSubmitted: submission.isAutoSubmitted ? 'Có' : 'Không',
      answersDetail: JSON.stringify(submission.answers)
    };

    const response = await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors', // Avoid CORS issues with redirecting Apps Script URLs
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error('Error syncing with Google Sheets:', error);
    return false;
  }
};
