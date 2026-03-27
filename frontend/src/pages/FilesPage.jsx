import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, File, Image, FileText, Trash2, Download, FolderOpen } from 'lucide-react';
import { fileAPI } from '@api/index';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const getIcon = (cat) => {
  if (cat === 'image') return <Image size={18} className="text-blue-500" />;
  if (cat === 'pdf') return <FileText size={18} className="text-red-500" />;
  return <File size={18} className="text-gray-500" />;
};

export default function FilesPage() {
  const { projectId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fileAPI.getProjectFiles(projectId)
      .then(d => setFiles(d.files || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const doUpload = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const data = await fileAPI.upload(projectId, fd);
      setFiles(prev => [data.file, ...prev]);
      toast.success(`"${file.name}" uploaded`);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) doUpload(f);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fileAPI.delete(id);
    setFiles(prev => prev.filter(f => f._id !== id));
    toast.success('File deleted');
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen size={16} /> Files ({files.length})
        </h2>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-primary text-xs gap-1.5">
          <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload file'}
        </button>
        <input ref={fileRef} type="file" className="hidden"
          onChange={e => { if (e.target.files[0]) doUpload(e.target.files[0]); e.target.value = ''; }} />
      </div>

      {/* Drop zone */}
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => fileRef.current?.click()}>
        <Upload size={20} className={`mx-auto mb-2 ${dragOver ? 'text-brand-500' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-500">
          {dragOver ? 'Drop to upload' : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Max 25 MB per file</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">No files uploaded yet</div>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f._id} className="card px-4 py-3 flex items-center gap-3 group hover:shadow-sm transition-all">
              <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                {f.category === 'image' && f.url
                  ? <img src={f.url} className="w-9 h-9 object-cover rounded-lg" />
                  : getIcon(f.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.originalName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{f.sizeFormatted}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{format(new Date(f.createdAt), 'MMM d, yyyy')}</span>
                  {f.uploadedBy && (
                    <><span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{f.uploadedBy.name}</span></>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={f.url} target="_blank" rel="noreferrer"
                  className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Download">
                  <Download size={13} />
                </a>
                <button onClick={() => handleDelete(f._id, f.originalName)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
