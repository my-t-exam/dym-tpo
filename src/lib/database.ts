/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, Submission, Member, Language } from '../types';
import { sampleExams } from '../data/mockData';

const EXAMS_KEY = 'employee_testing_exams';
const SUBMISSIONS_KEY = 'employee_testing_submissions';
const SHEETS_URL_KEY = 'employee_testing_sheets_url';
const MEMBERS_KEY = 'employee_testing_members';
const LANGUAGE_KEY = 'employee_testing_language';

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
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    if (!raw) {
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(defaultMembers));
      return defaultMembers;
    }
    const parsed = JSON.parse(raw) as Member[];
    
    // Ensure all superadmins & admins have 'dym123' password if none is set
    let updated = false;
    const patched = parsed.map(m => {
      if ((m.role === 'superadmin' || m.role === 'admin') && !m.password) {
        updated = true;
        return { ...m, password: 'dym123' };
      }
      return m;
    });

    // PROACTIVE PATCH: Ensure LY TIEU MY exists and has Super Admin role
    const index = patched.findIndex(m => m.email.toLowerCase().trim() === 'my-t@dymvietnam.net');
    if (index >= 0) {
      if (patched[index].name !== 'LY TIEU MY' || patched[index].role !== 'superadmin') {
        patched[index].name = 'LY TIEU MY';
        patched[index].role = 'superadmin';
        updated = true;
      }
      if (!patched[index].password) {
        patched[index].password = 'dym123';
        updated = true;
      }
    } else {
      patched.push({
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
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(patched));
    }
    return patched;
  } catch (e) {
    console.error('Error reading members from localStorage', e);
    return defaultMembers;
  }
};

const DEPARTMENTS_KEY = 'employee_testing_departments';
export const defaultDepartments = ['事務代行', 'マーケティング部', 'IT部', 'デザイン部', '人事部'];

export const getStoredDepartments = (): string[] => {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    if (!raw) {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(defaultDepartments));
      return defaultDepartments;
    }
    const parsed = JSON.parse(raw) as string[];
    // PROACTIVE PATCH: Normalize list to exact five active corporate departments requested if previous values present
    if (parsed.includes('業務部') || parsed.includes('総務人事部') || parsed.length === 4) {
      localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(defaultDepartments));
      return defaultDepartments;
    }
    return parsed;
  } catch (e) {
    return defaultDepartments;
  }
};

export const saveDepartments = (depts: string[]) => {
  try {
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(depts));
  } catch (e) {
    console.error('Error saving departments to localStorage', e);
  }
};

const TEAMS_KEY = 'employee_testing_dept_teams';
export const getStoredTeams = (): Record<string, string[]> => {
  try {
    const raw = localStorage.getItem(TEAMS_KEY);
    if (!raw) {
      const defaultTeams: Record<string, string[]> = {
        'IT部': ['Development', 'Infra', 'QA'],
        'マーケティング部': ['Growth', 'Content'],
        'デザイン部': ['UI/UX', 'Branding'],
        '人事部': ['HR', 'Recruiting'],
        '事務代行': ['Admin Support']
      };
      localStorage.setItem(TEAMS_KEY, JSON.stringify(defaultTeams));
      return defaultTeams;
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveStoredTeams = (teams: Record<string, string[]>) => {
  try {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  } catch (e) {
    console.error('Error saving teams to localStorage', e);
  }
};

export const saveMembers = (members: Member[]) => {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  } catch (e) {
    console.error('Error saving members to localStorage', e);
  }
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
  try {
    const raw = localStorage.getItem(EXAMS_KEY);
    if (!raw) {
      localStorage.setItem(EXAMS_KEY, JSON.stringify(sampleExams));
      return sampleExams;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading exams from localStorage', e);
    return sampleExams;
  }
};

export const saveExams = (exams: Exam[]) => {
  try {
    localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
  } catch (e) {
    console.error('Error saving exams to localStorage', e);
  }
};

export const getStoredSubmissions = (): Submission[] => {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading submissions from localStorage', e);
    return [];
  }
};

export const saveSubmissions = (submissions: Submission[]) => {
  try {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
  } catch (e) {
    console.error('Error saving submissions to localStorage', e);
  }
};

export const getStoredSheetsUrl = (): string => {
  try {
    return localStorage.getItem(SHEETS_URL_KEY) || '';
  } catch {
    return '';
  }
};

export const saveSheetsUrl = (url: string) => {
  try {
    localStorage.setItem(SHEETS_URL_KEY, url);
  } catch (e) {
    console.error('Error saving Google Sheets URL', e);
  }
};

/**
 * Autogrades a submission and returns the score
 */
export const calculateScore = (exam: Exam, answers: Record<string, number[]>): { score: number; maxScore: number } => {
  let score = 0;
  let maxScore = 0;

  exam.questions.forEach((q) => {
    maxScore += q.points;
    const selected = answers[q.id] || [];
    const correct = q.correctAnswers;

    if (q.type === 'single') {
      // Single choice must match exactly
      if (selected.length === 1 && correct.length === 1 && selected[0] === correct[0]) {
        score += q.points;
      }
    } else {
      // Multiple choice: must match exactly all selected choices
      if (selected.length === correct.length && selected.every(v => correct.includes(v))) {
        score += q.points;
      }
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
