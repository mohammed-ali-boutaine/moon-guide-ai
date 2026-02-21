'use client';

import { useState } from 'react';
import { StudentInClass } from '@/types';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StudentTableProps {
  students: StudentInClass[];
  onRemove: (studentId: string) => void;
  isLoading?: boolean;
}

type SortField = 'name' | 'email' | 'joined_at';
type SortDirection = 'asc' | 'desc';

export default function StudentTable({ students, onRemove, isLoading = false }: StudentTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRemove = (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      onRemove(studentId);
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name': {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case 'email':
        comparison = a.email.toLowerCase().localeCompare(b.email.toLowerCase());
        break;
      case 'joined_at':
        comparison = new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <span className="text-gray-400 ml-1">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }

    return (
      <span className="text-primary-500 ml-1">
        {sortDirection === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-300">No students</h3>
        <p className="mt-1 text-sm text-gray-400">Get started by adding a student to this class.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => handleSort('name')}
            >
              Name
              <SortIcon field="name" />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => handleSort('email')}
            >
              Email
              <SortIcon field="email" />
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-750 transition-colors"
              onClick={() => handleSort('joined_at')}
            >
              Joined Date
              <SortIcon field="joined_at" />
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-700">
          {sortedStudents.map((student) => (
            <tr key={student.id} className="hover:bg-gray-800 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-white">
                  {student.first_name} {student.last_name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-300">{student.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-300">{formatDate(student.joined_at)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(student.id, `${student.first_name} ${student.last_name}`)}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
