import { useState, useRef, useCallback } from 'react';
import { Download, ExternalLink, Upload, X, FileIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import CodeEditor from '../components/CodeEditor';
import QuestionSelector from '../components/QuestionSelector';
import { useAppState } from '../context/AppStateContext';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(idx + 1).toLowerCase() : null;
}

function addExtensionToGitignore(currentContent, ext) {
  if (!ext) return currentContent;
  const pattern = `*.${ext}`;
  const lines = currentContent.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.includes(pattern)) return currentContent;
  return [...lines, pattern].join('\n');
}

function FileUploadArea({ files, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) onAdd(dropped);
    },
    [onAdd]
  );

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) onAdd(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-400 block">Upload additional files (optional)</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-accent-blue bg-accent-blue/5'
            : 'border-dark-600 hover:border-dark-500'
        }`}
      >
        <Upload size={20} className="mx-auto text-gray-500 mb-1" />
        <p className="text-xs text-gray-500">
          Drag & drop files here, or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center justify-between px-3 py-2 bg-dark-900 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileIcon size={14} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-300 truncate">{f.name}</span>
                <span className="text-xs text-gray-600 shrink-0">{formatFileSize(f.size)}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                className="p-1 hover:bg-dark-700 rounded text-gray-500 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZipSection({
  title,
  description,
  zipName,
  setZipName,
  showNameInput,
  appCode,
  setAppCode,
  envContent,
  setEnvContent,
  reqContent,
  setReqContent,
  uploadedFiles,
  onAddFiles,
  onRemoveFile,
  gitignoreContent,
  setGitignoreContent,
  onGenerate,
}) {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-4 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      {showNameInput && (
        <div>
          <label className="text-xs font-medium text-gray-400 block mb-1">ZIP File Name</label>
          <input
            value={zipName}
            onChange={(e) => setZipName(e.target.value)}
            placeholder="e.g. PrefillCode"
            className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent-blue transition-colors"
          />
        </div>
      )}

      <CodeEditor
        value={appCode}
        onChange={setAppCode}
        placeholder="Paste app.py code here..."
        label="app.py Code"
        height="h-48"
      />

      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1">.env Content</label>
        <textarea
          value={envContent}
          onChange={(e) => setEnvContent(e.target.value)}
          placeholder='e.g. GEMINI_API_KEY="your_api_key_here"'
          rows={3}
          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1">requirements.txt Content</label>
        <textarea
          value={reqContent}
          onChange={(e) => setReqContent(e.target.value)}
          placeholder="Optional — leave empty to exclude from ZIP"
          rows={3}
          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
        />
      </div>

      {/* File Upload */}
      <FileUploadArea
        files={uploadedFiles}
        onAdd={onAddFiles}
        onRemove={onRemoveFile}
      />

      {/* .gitignore */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1">.gitignore</label>
        <textarea
          value={gitignoreContent}
          onChange={(e) => setGitignoreContent(e.target.value)}
          placeholder="Auto-populated from uploaded file extensions. Edit freely."
          rows={3}
          className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono resize-none focus:border-accent-blue transition-colors placeholder:text-gray-600"
        />
      </div>

      <div className="flex justify-end gap-3">
        <a
          href="https://nkb-backend-ccbp-beta.earlywave.in/admin/nkb_load_data/uploadfile/add/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 border border-dark-500 hover:border-gray-400 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          Boilerplate Code S3 URL
          <ExternalLink size={14} />
        </a>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-blue-600 rounded-lg text-sm font-medium text-white transition-colors"
        >
          <Download size={16} />
          Generate ZIP
        </button>
      </div>
    </div>
  );
}

export default function ZipGenerator() {
  const { activeProject, activeQuestion, updateQuestion } = useAppState();

  // Uploaded files are kept in component state (File objects can't be serialized)
  const [prefillFiles, setPrefillFiles] = useState([]);
  const [solutionFiles, setSolutionFiles] = useState([]);

  if (!activeProject || !activeQuestion) return null;

  const {
    prefilledCode,
    prefillName,
    prefillEnv,
    prefillReq,
    prefillGitignore,
    solutionCode,
    solutionEnv,
    solutionReq,
    solutionGitignore,
  } = activeQuestion;

  const set = (patch) => {
    const idx = activeProject.activeQuestionIndex;
    updateQuestion(idx, patch);
  };

  const handleAddPrefillFiles = (newFiles) => {
    setPrefillFiles((prev) => [...prev, ...newFiles]);
    // Auto-add extensions to gitignore
    let gi = prefillGitignore || '';
    for (const f of newFiles) {
      const ext = getExtension(f.name);
      if (ext) gi = addExtensionToGitignore(gi, ext);
    }
    set({ prefillGitignore: gi });
  };

  const handleRemovePrefillFile = (idx) => {
    setPrefillFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddSolutionFiles = (newFiles) => {
    setSolutionFiles((prev) => [...prev, ...newFiles]);
    let gi = solutionGitignore || '';
    for (const f of newFiles) {
      const ext = getExtension(f.name);
      if (ext) gi = addExtensionToGitignore(gi, ext);
    }
    set({ solutionGitignore: gi });
  };

  const handleRemoveSolutionFile = (idx) => {
    setSolutionFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const buildZip = async (name, appCode, envContent, reqContent, uploadedFiles, gitignoreContent) => {
    if (!appCode.trim()) {
      toast.error('app.py code is required');
      return;
    }
    if (!name.trim()) {
      toast.error('ZIP name is required');
      return;
    }

    const zip = new JSZip();
    zip.file('app.py', appCode);
    zip.file('.env', envContent || '');
    if (reqContent && reqContent.trim()) {
      zip.file('requirements.txt', reqContent);
    }
    if (gitignoreContent && gitignoreContent.trim()) {
      zip.file('.gitignore', gitignoreContent);
    }

    // Add uploaded files
    for (const file of uploadedFiles) {
      const content = await file.arrayBuffer();
      zip.file(file.name, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${name}.zip`);
    toast.success(`${name}.zip downloaded!`);
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-auto">
      <div>
        <h2 className="text-xl font-bold text-white">ZIP Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate prefilled and solution code ZIP bundles</p>
      </div>

      {/* Question Selector */}
      <QuestionSelector />

      <div className="grid grid-cols-2 gap-4">
        <ZipSection
          title="Prefilled Code ZIP"
          description="ZIP with starter/prefilled code for students"
          zipName={prefillName}
          setZipName={(v) => set({ prefillName: v })}
          showNameInput={true}
          appCode={prefilledCode}
          setAppCode={(v) => set({ prefilledCode: v })}
          envContent={prefillEnv}
          setEnvContent={(v) => set({ prefillEnv: v })}
          reqContent={prefillReq}
          setReqContent={(v) => set({ prefillReq: v })}
          uploadedFiles={prefillFiles}
          onAddFiles={handleAddPrefillFiles}
          onRemoveFile={handleRemovePrefillFile}
          gitignoreContent={prefillGitignore}
          setGitignoreContent={(v) => set({ prefillGitignore: v })}
          onGenerate={() => buildZip(prefillName, prefilledCode, prefillEnv, prefillReq, prefillFiles, prefillGitignore)}
        />

        <ZipSection
          title="Solution Code ZIP"
          description="ZIP with complete solution code (always named Solution.zip)"
          zipName="Solution"
          setZipName={() => {}}
          showNameInput={false}
          appCode={solutionCode}
          setAppCode={(v) => set({ solutionCode: v })}
          envContent={solutionEnv}
          setEnvContent={(v) => set({ solutionEnv: v })}
          reqContent={solutionReq}
          setReqContent={(v) => set({ solutionReq: v })}
          uploadedFiles={solutionFiles}
          onAddFiles={handleAddSolutionFiles}
          onRemoveFile={handleRemoveSolutionFile}
          gitignoreContent={solutionGitignore}
          setGitignoreContent={(v) => set({ solutionGitignore: v })}
          onGenerate={() => buildZip('Solution', solutionCode, solutionEnv, solutionReq, solutionFiles, solutionGitignore)}
        />
      </div>
    </div>
  );
}
