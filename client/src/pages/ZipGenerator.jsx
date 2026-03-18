import { Archive, Download, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import CodeEditor from '../components/CodeEditor';
import { useAppState } from '../context/AppStateContext';

function ZipSection({ title, description, zipName, setZipName, showNameInput, appCode, setAppCode, envContent, setEnvContent, reqContent, setReqContent, onGenerate }) {
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
  const { zipState, setZipState } = useAppState();
  const { prefillName, prefillCode, prefillEnv, prefillReq, solutionCode, solutionEnv, solutionReq } = zipState;

  const update = (patch) => setZipState((s) => ({ ...s, ...patch }));
  const setPrefillName = (v) => update({ prefillName: v });
  const setPrefillCode = (v) => update({ prefillCode: v });
  const setPrefillEnv = (v) => update({ prefillEnv: v });
  const setPrefillReq = (v) => update({ prefillReq: v });
  const setSolutionCode = (v) => update({ solutionCode: v });
  const setSolutionEnv = (v) => update({ solutionEnv: v });
  const setSolutionReq = (v) => update({ solutionReq: v });

  const buildZip = async (name, appCode, envContent, reqContent) => {
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

      <div className="grid grid-cols-2 gap-4">
        <ZipSection
          title="Prefilled Code ZIP"
          description="ZIP with starter/prefilled code for students"
          zipName={prefillName}
          setZipName={setPrefillName}
          showNameInput={true}
          appCode={prefillCode}
          setAppCode={setPrefillCode}
          envContent={prefillEnv}
          setEnvContent={setPrefillEnv}
          reqContent={prefillReq}
          setReqContent={setPrefillReq}
          onGenerate={() => buildZip(prefillName, prefillCode, prefillEnv, prefillReq)}
        />

        <ZipSection
          title="Solution Code ZIP"
          description="ZIP with complete solution code (always named Solution.zip)"
          zipName="Solution"
          setZipName={() => {}}
          showNameInput={false}
          appCode={solutionCode}
          setAppCode={setSolutionCode}
          envContent={solutionEnv}
          setEnvContent={setSolutionEnv}
          reqContent={solutionReq}
          setReqContent={setSolutionReq}
          onGenerate={() => buildZip('Solution', solutionCode, solutionEnv, solutionReq)}
        />
      </div>
    </div>
  );
}
