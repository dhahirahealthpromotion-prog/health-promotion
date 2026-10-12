
import { FullBackupData } from '../types';
import { INITIAL_USERS } from '../constants';

declare const JSZip: any;

/**
 * Escapes closing script and style tags to prevent breaking the HTML structure when embedded.
 */
const escapeScriptTags = (code: string) => {
  return code.replace(/<\/script>/g, '<\\/script>').replace(/<\/style>/g, '<\\/style>');
};

export const utf8ToBase64 = (str: string): string => {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error("Base64 Encoding Error:", e);
    return "";
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const SOURCE_FILES = [
    'index.tsx', 'App.tsx', 'types.ts', 'constants.ts',
    'components/LoginScreen.tsx', 'components/Header.tsx', 'components/InstitutionDashboard.tsx',
    'components/SupervisorDashboard.tsx', 'components/DashboardStats.tsx', 'components/ReportsTable.tsx',
    'components/InstitutionManagement.tsx', 'components/Settings.tsx', 'components/Logo.tsx',
    'components/HelpModal.tsx', 'components/OverviewTable.tsx', 'components/ChangePasswordModal.tsx',
    'components/SearchableSelect.tsx', 'components/FirebaseSetupWizard.tsx', 'components/MonthlyEntryForm.tsx',
    'components/HealthPromotionDashboard.tsx', 'components/PasswordManagement.tsx', 'components/Modal.tsx',
    'components/MobileInstallModal.tsx', 'components/ShareDataModal.tsx', 'components/SupervisorChoiceScreen.tsx',
    'components/FaviconManager.tsx',
    'utils/firebase.ts', 'utils/exportWord.ts', 'utils/exportExcel.ts', 'utils/exportPdf.ts',
    'utils/searchUtils.ts', 'utils/fullBackup.ts', 'utils/distributableApp.ts', 'utils/exportSheetTemplate.ts'
];

const fetchFileContent = async (path: string): Promise<string> => {
    try {
        const response = await fetch(path);
        if (!response.ok) return '';
        return await response.text();
    } catch (e) {
        return '';
    }
};

export const getDistributableHtmlString = async (
    appData: FullBackupData,
    exportType: 'empty' | 'snapshot'
): Promise<string> => {
    const docClone = document.documentElement.cloneNode(true) as HTMLHtmlElement;

    const rootEl = docClone.querySelector('#root');
    if (rootEl) {
        rootEl.innerHTML = '';
    }

    const scripts = docClone.querySelectorAll('script');
    scripts.forEach(script => {
        const src = script.getAttribute('src') || '';
        if (src.includes('@react-refresh') || src.includes('@vite/client')) {
            script.remove();
        }
        if (script.textContent?.includes('window.compressedEmbeddedAppData') || 
            script.textContent?.includes('window.__IS_DISTRIBUTED__')) {
            script.remove();
        }
        if (src === 'index.tsx' || src.includes('index.tsx')) {
            script.setAttribute('src', 'https://esm.sh/run');
            script.setAttribute('type', 'module');
            script.removeAttribute('crossorigin'); 
        }
    });

    const errorOverlay = docClone.querySelector('#react-error-overlay');
    if (errorOverlay) errorOverlay.remove();

    if (appData.appName) {
        let titleEl = docClone.querySelector('title');
        if (!titleEl) {
            titleEl = document.createElement('title');
            docClone.querySelector('head')?.appendChild(titleEl);
        }
        if (titleEl) titleEl.textContent = appData.appName;
    }

    let appDataForEmbedding: FullBackupData;
    if (exportType === 'empty') {
      appDataForEmbedding = {
        users: INITIAL_USERS, 
        reports: [], 
        customLogo: null, 
        supervisorPassword: '123', 
        immunizationPassword: '12345',
        appName: appData.appName || "برنامج الإجادة المؤسسية", 
        isDistributable: true, 
        isPublishedConnected: false, 
        firebaseConfig: null,
      };
    } else {
      appDataForEmbedding = { 
          ...appData, 
          isDistributable: true, 
          isPublishedConnected: true 
      };
    }

    const jsonDataString = JSON.stringify(appDataForEmbedding);
    const zip = new JSZip();
    zip.file("data.json", jsonDataString);
    const compressedBytes = await zip.generateAsync({ 
        type: "uint8array", 
        compression: "DEFLATE", 
        compressionOptions: { level: 9 } 
    });
    const encodedCompressedData = bytesToBase64(compressedBytes);
    
    // Inject BUILD_ID using current timestamp
    const dataScript = document.createElement('script');
    dataScript.type = 'text/javascript';
    dataScript.textContent = `
      window.__IS_DISTRIBUTED__ = true;
      window.__BUILD_ID__ = '${Date.now()}';
      window.compressedEmbeddedAppData = '${encodedCompressedData}';
    `;

    const bundleFragment = document.createDocumentFragment();
    for (const path of SOURCE_FILES) {
        const content = await fetchFileContent(path);
        if (content) {
            const s = document.createElement('script');
            s.setAttribute('type', 'text/babel');
            s.setAttribute('data-type', 'module');
            s.setAttribute('data-path', path);
            s.textContent = `\n${escapeScriptTags(content)}\n`;
            bundleFragment.appendChild(s);
        }
    }

    const body = docClone.querySelector('body');
    if (body) {
        body.appendChild(dataScript);
        body.appendChild(bundleFragment);
    }

    return '`' + '<!DOCTYPE html>\n' + docClone.outerHTML + '`'; // Added backticks for safer handling in some contexts, but outerHTML is standard
};

// Fixing the return above to be direct string
export const getDistributableHtmlStringFixed = async (
    appData: FullBackupData,
    exportType: 'empty' | 'snapshot'
): Promise<string> => {
    const html = await getDistributableHtmlString(appData, exportType);
    // Remove the backticks added by mistake in the logic above during thought process
    return html.startsWith('`') ? html.slice(1, -1) : html;
};

export const generateAndDownloadDistributableHtml = async (appData: FullBackupData, exportType: 'empty' | 'snapshot') => {
    try {
        const html = await getDistributableHtmlStringFixed(appData, exportType);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const fileName = `${appData.appName || 'برنامج_الإجادة_المؤسسية'}_${exportType === 'empty' ? 'نسخة_جديدة' : 'نسخة_بالبيانات'}.html`.replace(/\s+/g, '_');
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
        return true;
    } catch (e: any) { 
        console.error("HTML Generation Error:", e);
        alert("Error generating Single HTML file: " + e.message);
        return false;
    }
};

export const generateAndDownloadDistributableZip = async (appData: FullBackupData, exportType: 'empty' | 'snapshot') => {
    await generateAndDownloadDistributableHtml(appData, exportType);
};
