
import React, { useState } from 'react';
import Logo from './Logo';
import { parseFirebaseConfigString } from '../utils/firebase';

interface FirebaseSetupWizardProps {
  onConfigSave: (config: any) => void;
}

export const FirebaseSetupWizard: React.FC<FirebaseSetupWizardProps> = ({ onConfigSave }) => {
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    setError('');
    try {
      if (!configInput.trim()) {
         setError('Please paste the configuration code.');
         return;
      }
      
      // Use the smart parser from utils
      const config = parseFirebaseConfigString(configInput);
      
      if (!config || !config.apiKey || !config.databaseURL) {
        setError('Could not extract valid configuration. Please ensure "apiKey" and "databaseURL" are present.');
        return;
      }
      
      // Save and close
      onConfigSave(config);
      
    } catch (e) {
      console.error(e);
      setError('Invalid format. Try copying the entire code block from Firebase Console.');
    }
  };

  const handleOffline = () => {
     if (window.confirm("Working offline means data will ONLY be saved on this device and won't sync with others. Continue?")) {
         onConfigSave({}); 
     }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="bg-blue-800 p-6 text-white text-center flex-shrink-0">
            <Logo className="h-16 w-16 mx-auto mb-4 bg-white rounded-full border-4 border-blue-900" />
            <h2 className="text-3xl font-extrabold mb-2">Setup Database Connection</h2>
            <p className="text-blue-100 text-lg">Connect to Google Firebase Cloud</p>
        </div>
        
        <div className="p-6 sm:p-8 overflow-y-auto text-left ltr space-y-6 flex-grow">
            <p className="text-gray-600 dark:text-gray-300 text-base">
                To enable <strong>Real-time Sync</strong> between Supervisor and Institutions, you must link this app to a Firebase database.
            </p>

            <div className="space-y-4 border-l-4 border-blue-600 pl-4 ml-1">
                <div className="step">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">1. Create Project</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Go to <a href="https://console.firebase.google.com" target="_blank" className="text-blue-600 underline font-bold">Firebase Console</a> and add a new project.</p>
                </div>
                <div className="step">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">2. Register Web App</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Click the <strong>Web icon (&lt;/&gt;)</strong>, register an app name.</p>
                </div>
                <div className="step">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">3. Copy Config</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Copy the code block under <strong>"firebaseConfig"</strong> (or the whole script).</p>
                </div>
                <div className="step">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base">4. Create Database</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Go to <strong>Build</strong> &gt; <strong>Realtime Database</strong> &gt; <strong>Create Database</strong> (Start in Test Mode).</p>
                </div>
            </div>

            <div className="mt-4">
                <label className="block font-bold text-gray-700 dark:text-gray-200 mb-2">Paste the Config Code Here:</label>
                <div className="relative">
                    <textarea 
                        value={configInput}
                        onChange={(e) => {
                            setConfigInput(e.target.value);
                            if (error) setError('');
                        }}
                        className="w-full h-32 p-4 bg-gray-50 border-2 border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                        placeholder={`Example:
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  databaseURL: "https://...",
  projectId: "...",
  ...
};`}
                    ></textarea>
                    {configInput && (
                        <div className="absolute top-2 right-2 text-xs text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded-md animate-pulse">
                            Ready to Process
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">You can paste the whole text; the app will extract the settings automatically.</p>
                {error && <div className="mt-2 p-3 bg-red-50 text-red-700 border-l-4 border-red-500 rounded text-sm font-bold animate-pulse">{error}</div>}
            </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center flex-shrink-0">
            <button 
                onClick={handleOffline}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-bold underline"
            >
                Work Offline (Not Recommended)
            </button>
            <button 
                onClick={handleSave}
                className="w-full sm:w-auto px-8 py-3 bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
                <span>Connect & Start</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
        </div>
      </div>
    </div>
  );
};
