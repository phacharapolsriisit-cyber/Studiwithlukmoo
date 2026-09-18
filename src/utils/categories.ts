import { SubjectCategory } from '../types';

export interface CategoryInfo {
  id: SubjectCategory;
  label: string;
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CATEGORIES: Record<SubjectCategory, CategoryInfo> = {
  math: {
    id: 'math',
    label: 'คณิตศาสตร์ (Math)',
    iconName: 'Calculator',
    color: '#2563eb', // Blue
    bgColor: 'bg-blue-50 text-blue-700',
    borderColor: 'border-blue-200',
  },
  physics: {
    id: 'physics',
    label: 'ฟิสิกส์ (Physics)',
    iconName: 'Zap',
    color: '#7c3aed', // Purple
    bgColor: 'bg-purple-50 text-purple-700',
    borderColor: 'border-purple-200',
  },
  chemistry: {
    id: 'chemistry',
    label: 'เคมี (Chemistry)',
    iconName: 'FlaskConical',
    color: '#059669', // Emerald
    bgColor: 'bg-emerald-50 text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  biology: {
    id: 'biology',
    label: 'ชีววิทยา (Biology)',
    iconName: 'Dna',
    color: '#16a34a', // Green
    bgColor: 'bg-green-50 text-green-700',
    borderColor: 'border-green-200',
  },
  english: {
    id: 'english',
    label: 'ภาษาอังกฤษ (English)',
    iconName: 'Globe',
    color: '#d97706', // Amber
    bgColor: 'bg-amber-50 text-amber-700',
    borderColor: 'border-amber-200',
  },
  thai: {
    id: 'thai',
    label: 'ภาษาไทย (Thai)',
    iconName: 'BookOpen',
    color: '#ea580c', // Orange
    bgColor: 'bg-orange-50 text-orange-700',
    borderColor: 'border-orange-200',
  },
  social: {
    id: 'social',
    label: 'สังคมศึกษา (Social)',
    iconName: 'Landmark',
    color: '#0891b2', // Cyan
    bgColor: 'bg-cyan-50 text-cyan-700',
    borderColor: 'border-cyan-200',
  },
  computer: {
    id: 'computer',
    label: 'คอมพิวเตอร์ / โค้ด (Computer)',
    iconName: 'Code',
    color: '#4f46e5', // Indigo
    bgColor: 'bg-indigo-50 text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  general: {
    id: 'general',
    label: 'วิชาทั่วไป / เตรียมสอบ',
    iconName: 'GraduationCap',
    color: '#475569', // Slate
    bgColor: 'bg-slate-100 text-slate-700',
    borderColor: 'border-slate-300',
  },
  other: {
    id: 'other',
    label: 'อื่นๆ (Other)',
    iconName: 'Sparkles',
    color: '#db2777', // Pink
    bgColor: 'bg-pink-50 text-pink-700',
    borderColor: 'border-pink-200',
  },
};

export const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#059669', // Emerald
  '#16a34a', // Green
  '#eab308', // Yellow
  '#d97706', // Amber
  '#ea580c', // Orange
  '#dc2626', // Red
  '#db2777', // Pink
  '#9333ea', // Purple
  '#4f46e5', // Indigo
  '#475569', // Slate
];
