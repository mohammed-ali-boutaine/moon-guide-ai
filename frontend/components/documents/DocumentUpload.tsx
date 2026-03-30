'use client';

import { useState, useCallback, useRef } from 'react';
import { UploadProgress } from '@/types';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  uploads: UploadProgress[];
  accept?: string;
  maxFileSize?: number; // in MB
  disabled?: boolean;
}

export default function DocumentUpload({
  onUpload,
  uploads,
  accept = '.pdf,.docx,.txt,.md',
  maxFileSize = 50,
  disabled = false,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ['pdf', 'docx', 'txt', 'md'].includes(ext || '');
      });

      const validFiles = files.filter((file) => {
        const sizeInMB = file.size / (1024 * 1024);
        return sizeInMB <= maxFileSize;
      });

      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
    },
    [disabled, maxFileSize, onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = Array.from(e.target.files || []).filter((file) => {
        const sizeInMB = file.size / (1024 * 1024);
        return sizeInMB <= maxFileSize;
      });

      if (files.length > 0) {
        onUpload(files);
      }

      // Reset input
      e.target.value = '';
    },
    [disabled, maxFileSize, onUpload]
  );

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return (
          <svg className="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready';
      case 'error':
        return 'Error';
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
        return 'bg-primary-600';
      case 'processing':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragOver 
            ? 'border-primary-500 bg-primary-500/10' 
            : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={accept}
          multiple
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="pointer-events-none">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-200 mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            PDF, DOCX, TXT, or MD up to {maxFileSize}MB
          </p>
        </div>
      </div>

      {/* Upload Progress List */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          {uploads.map((upload, index) => (
            <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(upload.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {upload.fileName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(upload.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <span className={`
                  text-xs font-medium px-2 py-1 rounded-full
                  ${upload.status === 'error' 
                    ? 'bg-red-900/30 text-red-400' 
                    : upload.status === 'completed'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-gray-800 text-gray-400'
                  }
                `}>
                  {getStatusText(upload.status)}
                </span>
              </div>

              {/* Progress Bar */}
              {upload.status !== 'error' && (
                <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full transition-all duration-300 ${getStatusColor(upload.status)}`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}

              {/* Error Message */}
              {upload.status === 'error' && upload.error && (
                <p className="text-xs text-red-400 mt-2">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
