'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Class,
  PaginatedClasses,
  CreateClassData,
  UpdateClassData,
  ClassDetail,
  AddStudentsResponse,
  StudentInClass,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function fetchClasses(page: number = 1, pageSize: number = 10, search?: string): Promise<PaginatedClasses> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  if (search) {
    params.append('search', search);
  }

  const response = await fetch(`${API_URL}/api/classes?${params}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch classes');
  }

  return response.json();
}

async function createClass(data: CreateClassData): Promise<Class> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create class');
  }

  return response.json();
}

async function updateClass(id: string, data: UpdateClassData): Promise<Class> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update class');
  }

  return response.json();
}

async function deleteClass(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete class');
  }
}

export function useClasses(page: number = 1, pageSize: number = 10, search?: string) {
  return useQuery({
    queryKey: ['classes', page, pageSize, search],
    queryFn: () => fetchClasses(page, pageSize, search),
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClass,
    onMutate: async (newClass) => {
      await queryClient.cancelQueries({ queryKey: ['classes'] });

      const previousClasses = queryClient.getQueryData<PaginatedClasses>(['classes', 1, 10, undefined]);

      queryClient.setQueryData<PaginatedClasses>(['classes', 1, 10, undefined], (old) => {
        if (!old) return old;
        const optimisticClass: Class = {
          id: `temp-${Date.now()}`,
          name: newClass.name,
          description: newClass.description,
          student_count: 0,
          teacher_id: '',
          created_at: new Date().toISOString(),
        };
        return {
          ...old,
          items: [optimisticClass, ...old.items],
          total: old.total + 1,
        };
      });

      return { previousClasses };
    },
    onError: (_err, _newClass, context) => {
      if (context?.previousClasses) {
        queryClient.setQueryData(['classes', 1, 10, undefined], context.previousClasses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClassData }) => updateClass(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['classes'] });

      const previousClasses = queryClient.getQueryData<PaginatedClasses>(['classes', 1, 10, undefined]);

      queryClient.setQueryData<PaginatedClasses>(['classes', 1, 10, undefined], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((cls) =>
            cls.id === id ? { ...cls, ...data } : cls
          ),
        };
      });

      return { previousClasses };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousClasses) {
        queryClient.setQueryData(['classes', 1, 10, undefined], context.previousClasses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClass,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['classes'] });

      const previousClasses = queryClient.getQueryData<PaginatedClasses>(['classes', 1, 10, undefined]);

      queryClient.setQueryData<PaginatedClasses>(['classes', 1, 10, undefined], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((cls) => cls.id !== deletedId),
          total: old.total - 1,
        };
      });

      return { previousClasses };
    },
    onError: (_err, _deletedId, context) => {
      if (context?.previousClasses) {
        queryClient.setQueryData(['classes', 1, 10, undefined], context.previousClasses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

// Fetch class detail with students
async function fetchClassDetail(classId: string): Promise<ClassDetail> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes/${classId}`, {
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch class details');
  }

  return response.json();
}

// Add multiple students to class
async function addStudentsToClass(classId: string, emails: string[]): Promise<AddStudentsResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes/${classId}/students/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ emails }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add students');
  }

  return response.json();
}

// Remove student from class
async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove student');
  }
}

// Hook to fetch class detail
export function useClassDetail(classId: string) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: () => fetchClassDetail(classId),
    enabled: !!classId,
  });
}

// Hook to add students to class
export function useAddStudents(classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emails: string[]) => addStudentsToClass(classId, emails),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

// Hook to remove student from class
export function useRemoveStudent(classId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => removeStudentFromClass(classId, studentId),
    onMutate: async (studentId) => {
      await queryClient.cancelQueries({ queryKey: ['class', classId] });

      const previousClass = queryClient.getQueryData<ClassDetail>(['class', classId]);

      queryClient.setQueryData<ClassDetail>(['class', classId], (old) => {
        if (!old) return old;
        return {
          ...old,
          students: old.students.filter((s) => s.id !== studentId),
          student_count: old.student_count - 1,
        };
      });

      return { previousClass };
    },
    onError: (_err, _studentId, context) => {
      if (context?.previousClass) {
        queryClient.setQueryData(['class', classId], context.previousClass);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

