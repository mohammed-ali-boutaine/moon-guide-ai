import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Class {
  id: string;
  name: string;
  description: string;
  student_count: number;
  created_at: string;
}

interface ClassCardProps {
  classData: Class;
  onEdit: (cls: Class) => void;
  onDelete: (id: string) => void;
}

export default function ClassCard({ classData, onEdit, onDelete }: ClassCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">{classData.name}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {classData.description || 'No description'}
          </p>
        </div>

        <div
          className={cn(
            'flex items-center gap-1 ml-2 transition-opacity duration-200',
            showActions ? 'opacity-100' : 'opacity-0'
          )}
        >
          <button
            onClick={() => onEdit(classData)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-primary-400/10 transition-colors"
            aria-label="Edit class"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(classData.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            aria-label="Delete class"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {classData.student_count} {classData.student_count === 1 ? 'student' : 'students'}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(classData.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <Link
          href={`/dashboard/teacher/classes/${classData.id}`}
          className="text-sm text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
        >
          Manage
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
