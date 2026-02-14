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
