'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { resolveFileUrl } from '../../lib/file-url';

type Props = {
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  maxSizeMb?: number;
  helpText?: string;
  accept?: string;
  allowedMimeTypes?: string[];
};

export default function ImageUpload({ label, value, onChange, maxSizeMb = 10, helpText, accept = 'image/*', allowedMimeTypes }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const previewUrl = value ? resolveFileUrl(value) : null;

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (allowedMimeTypes?.length && !allowedMimeTypes.includes(file.type)) {
      toast.error('Unsupported image type');
      return;
    }
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Image must be <= ${maxSizeMb}MB`);
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    try {
      setUploading(true);
      const res = await api.post('/uploads/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.url as string;
      if (!url) {
        toast.error('Upload failed');
        return;
      }
      onChange(url);
      toast.success('Image uploaded');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-6">
        <div className="shrink-0">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden relative">
            {previewUrl ? (
              <img src={previewUrl} alt={label} className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <button
              type="button"
              onClick={pick}
              disabled={uploading}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
          {value && (
            <div className="text-xs text-slate-500 break-all">
              {value}
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await upload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
