/**
 * Common types used across the application
 */

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
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
  image_url: string | null;
  thumbnail_url: string | null;
  student_count: number;
  teacher_id: string;
  created_at: string;
}

export interface ClassDetail {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
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
  image_url?: string;
  thumbnail_url?: string;
}

export interface UpdateClassData {
  name?: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string;
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

// Document types
export type DocumentStatus = 'pending' | 'approved' | 'processing' | 'ready' | 'rejected';
export type DocumentFileType = 'pdf' | 'docx' | 'txt' | 'md';
export type DocumentScope = 'personal' | 'class';

export interface Document {
  id: number;
  scope: DocumentScope;
  class_id: string | null;
  filename: string;
  file_url: string;
  file_type: DocumentFileType;
  status: DocumentStatus;
  uploaded_by_id: string;
  uploaded_by_role: 'student' | 'teacher';
  approved_by_id: string | null;
  approved_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  file_size_bytes: number | null;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

export interface DocumentUploadResponse {
  document_id: number;
  status: DocumentStatus;
  filename: string;
  file_type: DocumentFileType;
  message: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  documentId?: number;
}
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
  image_url: string | null;
  thumbnail_url: string | null;
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

// Chat types
export interface MessageSource {
  document_id?: number;
  document_filename?: string;
  chunk_index?: number;
  score: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: MessageSource[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  class_id: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface ChatResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  had_context: boolean;
  retrieved_chunks: number;
  used_chunks: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
