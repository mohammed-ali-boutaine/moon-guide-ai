'use client';

import { useCallback, useRef, useState } from 'react';
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

  // Use local API proxy route instead of direct backend call
  // This ensures same-origin requests so cookies are sent properly
  const uploadUrl = `/api/upload/class/${classId}`;

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
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else if (xhr.status === 401) {
        reject(new Error('Authentication failed. Please log in again.'));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Accept', 'application/json');
    // Note: Don't set Content-Type - let browser set it with boundary for FormData
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

  // Use local API proxy route instead of direct backend call
  // This ensures same-origin requests so cookies are sent properly
  const uploadUrl = '/api/upload/personal';

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
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else if (xhr.status === 401) {
        reject(new Error('Authentication failed. Please log in again.'));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Accept', 'application/json');
    // Note: Don't set Content-Type - let browser set it with boundary for FormData
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

/**
 * Class document upload without useMutation variables — storing `File` in TanStack Query
 * mutation state triggers Firefox XrayWrapper errors when DevTools/extensions inspect it.
 */
export function useUploadClassDocument(classId: string) {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(0);
  const [isPending, setIsPending] = useState(false);

  const upload = useCallback(
    async (file: File, onProgress: (progress: number) => void) => {
      inFlightRef.current += 1;
      setIsPending(true);
      try {
        const result = await uploadClassDocument(classId, file, onProgress);
        queryClient.invalidateQueries({ queryKey: ['class-documents', classId] });
        return result;
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setIsPending(false);
      }
    },
    [classId, queryClient]
  );

  return { upload, isPending };
}

export function useUploadPersonalDocument() {
  const queryClient = useQueryClient();
  const inFlightRef = useRef(0);
  const [isPending, setIsPending] = useState(false);

  const upload = useCallback(
    async (file: File, onProgress: (progress: number) => void) => {
      inFlightRef.current += 1;
      setIsPending(true);
      try {
        const result = await uploadPersonalDocument(file, onProgress);
        queryClient.invalidateQueries({ queryKey: ['personal-documents'] });
        return result;
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setIsPending(false);
      }
    },
    [queryClient]
  );

  return { upload, isPending };
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

// Fetch individual document status
async function fetchDocumentStatus(documentId: number) {
  const response = await fetch(`${API_URL}/api/documents/${documentId}/status`, {
    ...AUTH_FETCH_OPTIONS,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch document status');
  }
  return response.json() as Promise<{
    document_id: number;
    status: string;
    chunk_count: number;
    filename: string;
  }>;
}

// Hook to poll a single document's processing status. Stops polling once ready or rejected.
export function useDocumentStatus(documentId: number | null) {
  return useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => fetchDocumentStatus(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'ready' || status === 'rejected' ? false : 2000;
    },
  });
}
