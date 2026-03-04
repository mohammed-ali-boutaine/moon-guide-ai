'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {  DocumentListResponse, DocumentUploadResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Shared fetch options – auth is handled via httpOnly cookie. */
const AUTH_FETCH_OPTIONS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

// Fetch class documents
async function fetchClassDocuments(classId: string): Promise<DocumentListResponse> {
  const response = await fetch(`${API_URL}/api/classes/${classId}/documents`, {
    ...AUTH_FETCH_OPTIONS,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch documents');
  }

  return response.json();
}

// Fetch personal documents
async function fetchPersonalDocuments(): Promise<DocumentListResponse> {
  const response = await fetch(`${API_URL}/api/documents/personal`, {
    ...AUTH_FETCH_OPTIONS,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch documents');
  }

  return response.json();
}

// Upload class document with progress tracking
async function uploadClassDocument(
  classId: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_URL}/api/classes/${classId}/documents`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

// Upload personal document with progress tracking
async function uploadPersonalDocument(
  file: File,
  onProgress: (progress: number) => void
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_URL}/api/documents/personal`);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

// Delete document
async function deleteDocument(documentId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/documents/${documentId}`, {
    method: 'DELETE',
    ...AUTH_FETCH_OPTIONS,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
}

// Hook to fetch class documents
export function useClassDocuments(classId: string) {
  return useQuery({
    queryKey: ['class-documents', classId],
    queryFn: () => fetchClassDocuments(classId),
    enabled: !!classId,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });
}

// Hook to fetch personal documents
export function usePersonalDocuments() {
  return useQuery({
    queryKey: ['personal-documents'],
    queryFn: fetchPersonalDocuments,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });
}

// Hook to upload class document
export function useUploadClassDocument(classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress: (progress: number) => void;
    }) => uploadClassDocument(classId, file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-documents', classId] });
    },
  });
}

// Hook to upload personal document
export function useUploadPersonalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress: (progress: number) => void;
    }) => uploadPersonalDocument(file, onProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-documents'] });
    },
  });
}

// Hook to delete document
export function useDeleteDocument(classId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      if (classId) {
        queryClient.invalidateQueries({ queryKey: ['class-documents', classId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['personal-documents'] });
      }
    },
  });
}
