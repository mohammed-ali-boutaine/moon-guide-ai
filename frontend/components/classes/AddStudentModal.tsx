'use client';

import { useState, FormEvent } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useAddStudents } from '@/hooks/use-classes';
import { AddStudentResult } from '@/types';
import { cn } from '@/lib/utils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onSuccess?: () => void;
}

export default function AddStudentModal({ isOpen, onClose, classId, onSuccess }: AddStudentModalProps) {
  const [emailsInput, setEmailsInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [results, setResults] = useState<AddStudentResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { mutate: addStudents, isPending } = useAddStudents(classId);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseEmails = (input: string): string[] => {
    // Split by comma, newline, or semicolon
    const emails = input
      .split(/[,;\n]/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    // Remove duplicates
    return [...new Set(emails)];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setResults([]);
    setShowResults(false);

    if (!emailsInput.trim()) {
      setValidationError('Please enter at least one email address');
      return;
    }

    const emails = parseEmails(emailsInput);

    if (emails.length === 0) {
      setValidationError('Please enter at least one valid email address');
      return;
    }

    // Validate email format
    const invalidEmails = emails.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      setValidationError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }

    addStudents(emails, {
      onSuccess: (response) => {
        setResults(response.results);
        setShowResults(true);

        // If all successful, close modal and reset
        if (response.summary.failed === 0) {
          setTimeout(() => {
            handleClose();
            if (onSuccess) onSuccess();
          }, 1500);
        }
      },
      onError: (error) => {
        setValidationError(error instanceof Error ? error.message : 'Failed to add students');
      },
    });
  };

  const handleClose = () => {
    setEmailsInput('');
    setValidationError('');
    setResults([]);
    setShowResults(false);
    onClose();
  };

  const getResultIcon = (success: boolean) => {
    if (success) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Students" size="lg">
      {!showResults ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="emails" className="block text-sm font-medium text-gray-300 mb-2">
              Student Email Addresses
            </label>
            <textarea
              id="emails"
              value={emailsInput}
              onChange={(e) => {
                setEmailsInput(e.target.value);
                setValidationError('');
              }}
              placeholder="Enter one or more email addresses&#10;Separated by comma, semicolon, or new line&#10;Example:&#10;student1@example.com&#10;student2@example.com, student3@example.com"
              rows={6}
              className={cn(
                'w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors',
                validationError ? 'border-red-500' : 'border-gray-700'
              )}
              disabled={isPending}
            />
            {validationError && (
              <p className="mt-2 text-sm text-red-500">{validationError}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              You can paste multiple emails separated by commas, semicolons, or new lines
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending}>
              Add Students
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-white mb-2">Results</h3>
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{results.length}</div>
                <div className="text-sm text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {results.filter((r) => r.success).length}
                </div>
                <div className="text-sm text-gray-400">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {results.filter((r) => !r.success).length}
                </div>
                <div className="text-sm text-gray-400">Failed</div>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  result.success
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-red-900/20 border-red-700/50'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">{getResultIcon(result.success)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{result.email}</p>
                  {result.success && result.student && (
                    <p className="text-sm text-gray-400">
                      Added: {result.student.first_name} {result.student.last_name}
                    </p>
                  )}
                  {!result.success && result.error && (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            {results.filter((r) => !r.success).length > 0 ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowResults(false);
                    setResults([]);
                    const failedEmails = results
                      .filter((r) => !r.success)
                      .map((r) => r.email)
                      .join('\n');
                    setEmailsInput(failedEmails);
                  }}
                >
                  Retry Failed
                </Button>
                <Button variant="primary" onClick={handleClose}>
                  Close
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
