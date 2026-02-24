/**
 * Common types used across the application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  documentId: string;
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// Class-related types
export interface StudentInClass {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  joined_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string | null;
  student_count: number;
  teacher_id: string;
  created_at: string;
}

export interface ClassDetail {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  created_at: string;
  students: StudentInClass[];
  student_count: number;
}

export interface PaginatedClasses {
  items: Class[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateClassData {
  name: string;
  description: string;
}

export interface UpdateClassData {
  name?: string;
  description?: string;
}

export interface AddStudentResult {
  email: string;
  success: boolean;
  error: string | null;
  student: StudentInClass | null;
}

export interface AddStudentsResponse {
  results: AddStudentResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Student Class types
export interface TeacherInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface StudentClass {
  id: string;
  name: string;
  description: string | null;
  teacher: TeacherInfo;
  student_count: number;
  joined_at: string;
  created_at: string;
}

export interface PaginatedStudentClasses {
  items: StudentClass[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
