/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple'; // single choice vs multiple choice
  options: string[];
  correctAnswers: number[]; // indices of correct option(s) (0-indexed)
  points: number; // point value of this question
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO format string or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO format string or YYYY-MM-DDTHH:mm
  duration: number;  // duration in minutes
  questions: Question[];
  createdAt: string;
  createdBy?: string; // Email or admin-id of creator
  department?: string; // Target department mapping (e.g., 'All' or department name)
  team?: string;       // Target team mapping (e.g., undefined/empty for all teams or specific team)
}

export interface Submission {
  id: string;
  examId: string;
  examTitle: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment?: string;
  employeeTeam?: string;
  answers: Record<string, number[]>; // question.id -> list of selected option indices
  score: number;
  maxScore: number;
  submittedAt: string;
  isAutoSubmitted: boolean;
  timeTakenSeconds?: number; // Total duration employee spent inside the exam in seconds
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'member';
  department: string;
  team?: string; // Optional team branch/sub-group under department
  createdAt: string;
  createdBy?: string; // Email or admin email of creator
  password?: string; // Password is required for superadmin/admin accounts
}

export type Language = 'vi' | 'ja';

export interface AppSettings {
  googleSheetAppUrl: string; // Apps Script Web App URL for Sheets sync
  isAdminMode: boolean;
}
