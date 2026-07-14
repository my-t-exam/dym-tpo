/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';

/**
 * Formats department names to be clearly localized in both Vietnamese and Japanese
 */
export function formatDept(dept: string, lang: Language): string {
  if (!dept) return '';
  const clean = dept.trim();
  switch (clean) {
    case 'IT部':
    case 'IT':
    case 'Phòng IT':
      return lang === 'vi' ? 'Phòng IT (IT部)' : 'IT部 (Phòng IT)';
    case 'マーケティング部':
    case 'Marketing':
    case 'Phòng Marketing':
      return lang === 'vi' ? 'Phòng Marketing (マーケティング部)' : 'マーケティング部 (Phòng Marketing)';
    case 'デザイン部':
    case 'Design':
    case 'Phòng Thiết kế':
      return lang === 'vi' ? 'Phòng Thiết kế (デザイン部)' : 'デザイン部 (Phòng Thiết kế)';
    case '人事部':
    case 'HR':
    case 'Phòng Nhân sự':
      return lang === 'vi' ? 'Phòng Nhân sự (人事部)' : '人事部 (Phòng Nhân sự)';
    case '事務代行':
    case 'BPO':
    case 'Hỗ trợ hành chính':
      return lang === 'vi' ? 'Hỗ trợ hành chính (事務代行)' : '事務代行 (Hỗ trợ hành chính)';
    default:
      return clean;
  }
}

/**
 * Formats team names to be clearly localized in both Vietnamese and Japanese
 */
export function formatTeam(team: string, lang: Language): string {
  if (!team) return '';
  const clean = team.trim();
  switch (clean) {
    case 'Development':
      return lang === 'vi' ? 'Phát triển (Development)' : '開発 (Development)';
    case 'Infra':
      return lang === 'vi' ? 'Hạ tầng (Infra)' : 'インフラ (Infra)';
    case 'QA':
      return lang === 'vi' ? 'Kiểm thử (QA)' : '品質保証 (QA)';
    case 'Growth':
      return lang === 'vi' ? 'Tăng trưởng (Growth)' : 'グロース (Growth)';
    case 'Content':
      return lang === 'vi' ? 'Nội dung (Content)' : 'コンテンツ (Content)';
    case 'UI/UX':
      return lang === 'vi' ? 'Thiết kế giao diện (UI/UX)' : 'UI/UXデザイン (UI/UX)';
    case 'Branding':
      return lang === 'vi' ? 'Thương hiệu (Branding)' : 'ブランディング (Branding)';
    case 'HR':
      return lang === 'vi' ? 'Nhân sự (HR)' : '人事 (HR)';
    case 'Recruiting':
      return lang === 'vi' ? 'Tuyển dụng (Recruiting)' : '採用 (Recruiting)';
    case 'Admin Support':
      return lang === 'vi' ? 'Hỗ trợ hành chính (Admin Support)' : '事務サポート (Admin Support)';
    default:
      return clean;
  }
}
