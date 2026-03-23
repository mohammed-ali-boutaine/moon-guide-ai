import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Class } from '@/types';

interface ClassFormData {
  name: string;
  description: string;
  image_url?: string;
  thumbnail_url?: string;
}

interface ClassFormProps {
  initialData?: Class;
  onSubmit: (data: ClassFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export default function ClassForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create Class',
}: ClassFormProps) {
  const [formData, setFormData] = useState<ClassFormData>({
    name: '',
    description: '',
    image_url: '',
    thumbnail_url: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [errors, setErrors] = useState<Partial<Record<keyof ClassFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description ?? '',
        image_url: initialData.image_url ?? '',
        thumbnail_url: initialData.thumbnail_url ?? '',
      });
      setImagePreview(initialData.thumbnail_url || initialData.image_url || null);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ClassFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Class name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Class name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image_url: 'Please upload an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image_url: 'Image must be less than 5MB' }));
      return;
    }

    setIsUploading(true);
    setErrors((prev) => ({ ...prev, image_url: undefined }));

    try {
      // Create preview immediately
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch(`${API_URL}/api/upload/class-image`, {
        method: 'POST',
        credentials: 'include',
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        image_url: data.image_url,
        thumbnail_url: data.thumbnail_url,
      }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, image_url: 'Failed to upload image. Please try again.' }));
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image_url: '', thumbnail_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const isProcessing = isSubmitting || isUploading;

  const handleChange = (field: keyof ClassFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Class Image <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <div className="relative">
          {imagePreview ? (
            <div className="relative w-full h-40 rounded-lg overflow-hidden bg-gray-800">
              <img
                src={imagePreview}
                alt="Class preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isProcessing}
                className="absolute top-2 right-2 p-1.5 bg-gray-900/80 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={cn(
                'w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors',
                errors.image_url
                  ? 'border-red-500/50 text-red-400 hover:border-red-500'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300'
              )}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">Click to upload class image</span>
              <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isProcessing}
            className="hidden"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center rounded-lg">
              <div className="w-8 h-8 border-2 border-gray-700 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        {errors.image_url && (
          <p className="mt-1 text-sm text-red-400">{errors.image_url}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1.5">
          Class Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter class name"
          disabled={isProcessing}
          className={cn(
            'w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors disabled:opacity-50',
            errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-gray-700 focus:border-primary-500'
          )}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1.5">
          Description <span className="text-gray-500 text-xs">(optional)</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter class description"
          rows={4}
          disabled={isProcessing}
          className={cn(
            'w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors resize-none disabled:opacity-50',
            errors.description ? 'border-red-500/50 focus:border-red-500' : 'border-gray-700 focus:border-primary-500'
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.description ? (
            <p className="text-sm text-red-400">{errors.description}</p>
          ) : (
            <span />
          )}
          <span className={cn(
            'text-xs',
            formData.description.length > 450 ? 'text-yellow-400' : 'text-gray-500'
          )}>
            {formData.description.length}/500
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isProcessing}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
