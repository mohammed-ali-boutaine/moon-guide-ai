'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import type { Class, CreateClassData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FETCH_OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

async function fetchAllClasses(): Promise<Class[]> {
  const res = await fetch(`${API_URL}/api/classes?page=1&page_size=100`, FETCH_OPTS);
  if (!res.ok) throw new Error('Failed to fetch classes');
  const data = await res.json();
  return data.items ?? [];
}

async function createClassApi(data: CreateClassData): Promise<Class> {
  const res = await fetch(`${API_URL}/api/classes`, {
    method: 'POST',
    ...FETCH_OPTS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create class');
  }
  return res.json();
}

interface ClassContextValue {
  classes: Class[];
  selectedClass: Class | null;
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  createClass: (data: CreateClassData) => Promise<Class>;
  isCreating: boolean;
  isLoading: boolean;
}

const ClassContext = createContext<ClassContextValue>({
  classes: [],
  selectedClass: null,
  selectedClassId: null,
  setSelectedClassId: () => {},
  createClass: async () => { throw new Error('not ready'); },
  isCreating: false,
  isLoading: false,
});

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';
  const qc = useQueryClient();

  const [selectedClassId, setSelectedClassIdState] = useState<string | null>(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['teacher-classes-all'],
    queryFn: fetchAllClasses,
    enabled: isTeacher,
    staleTime: 60_000,
  });

  // Restore persisted selection
  useEffect(() => {
    if (!isTeacher) return;
    const saved = localStorage.getItem('teacher_selected_class');
    if (saved) setSelectedClassIdState(saved);
  }, [isTeacher]);

  // If saved class no longer exists in the list, clear it
  useEffect(() => {
    if (!isTeacher || classes.length === 0) return;
    const saved = localStorage.getItem('teacher_selected_class');
    if (saved && !classes.find((c) => c.id === saved)) {
      localStorage.removeItem('teacher_selected_class');
      setSelectedClassIdState(null);
    }
  }, [classes, isTeacher]);

  const setSelectedClassId = useCallback((id: string | null) => {
    setSelectedClassIdState(id);
    if (id) localStorage.setItem('teacher_selected_class', id);
    else localStorage.removeItem('teacher_selected_class');
  }, []);

  const createMutation = useMutation({
    mutationFn: createClassApi,
    onSuccess: (newClass) => {
      qc.invalidateQueries({ queryKey: ['teacher-classes-all'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      // Auto-select the new class
      setSelectedClassId(newClass.id);
    },
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  return (
    <ClassContext.Provider
      value={{
        classes,
        selectedClass,
        selectedClassId,
        setSelectedClassId,
        createClass: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isLoading,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
}

export function useClassContext() {
  return useContext(ClassContext);
}
