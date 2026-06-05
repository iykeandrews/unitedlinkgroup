"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImageUpload;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../lib/api"));
const sonner_1 = require("sonner");
const file_url_1 = require("../../lib/file-url");
function ImageUpload({ label, value, onChange, maxSizeMb = 10, helpText, accept = 'image/*', allowedMimeTypes }) {
    const inputRef = (0, react_1.useRef)(null);
    const [uploading, setUploading] = (0, react_1.useState)(false);
    const previewUrl = value ? (0, file_url_1.resolveFileUrl)(value) : null;
    const pick = () => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.click(); };
    const upload = async (file) => {
        var _a, _b, _c;
        if (!file.type.startsWith('image/')) {
            sonner_1.toast.error('Please select an image file');
            return;
        }
        if ((allowedMimeTypes === null || allowedMimeTypes === void 0 ? void 0 : allowedMimeTypes.length) && !allowedMimeTypes.includes(file.type)) {
            sonner_1.toast.error('Unsupported image type');
            return;
        }
        const maxBytes = maxSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            sonner_1.toast.error(`Image must be <= ${maxSizeMb}MB`);
            return;
        }
        const fd = new FormData();
        fd.append('file', file);
        try {
            setUploading(true);
            const res = await api_1.default.post('/uploads/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const url = (_a = res.data) === null || _a === void 0 ? void 0 : _a.url;
            if (!url) {
                sonner_1.toast.error('Upload failed');
                return;
            }
            onChange(url);
            sonner_1.toast.success('Image uploaded');
        }
        catch (e) {
            sonner_1.toast.error(((_c = (_b = e === null || e === void 0 ? void 0 : e.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || 'Image upload failed');
        }
        finally {
            setUploading(false);
        }
    };
    return (<div>
      <div className="flex items-start gap-6">
        <div className="shrink-0">
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 overflow-hidden relative">
            {previewUrl ? (<img src={previewUrl} alt={label} className="w-full h-full object-contain"/>) : (<lucide_react_1.Image className="w-8 h-8 text-slate-400"/>)}
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <button type="button" onClick={pick} disabled={uploading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-2">
              <lucide_react_1.Upload className="w-4 h-4"/>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>

          {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
          {value && (<div className="text-xs text-slate-500 break-all">
              {value}
            </div>)}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={async (e) => {
            var _a;
            const file = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
            if (file)
                await upload(file);
            e.target.value = '';
        }}/>
    </div>);
}
