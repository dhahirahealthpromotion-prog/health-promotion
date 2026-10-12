
export const exportSupervisorGuideWord = () => {
  const fileName = "EPI_Supervisor_Guide";
  const date = new Date().toLocaleDateString();

  const htmlContent = `
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Supervisor Guide</title>
        <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; padding: 20px; }
            h1 { color: #006A4E; border-bottom: 2px solid #006A4E; padding-bottom: 10px; }
            h2 { color: #004D40; margin-top: 30px; }
            ul, ol { margin-bottom: 20px; }
            li { margin-bottom: 10px; }
            .notice { background: #fff3e0; border-left: 5px solid #ff9800; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>EPI Application Supervisor Guide</h1>
        <p>Last Updated: ${date}</p>

        <h2>1. Getting Started</h2>
        <p>The EPI (Expanded Program on Immunization) Application is designed for offline-first reporting and cloud synchronization using Firebase.</p>

        <h2>2. Data Management</h2>
        <ul>
            <li><strong>Institutions:</strong> Manage health institutions and their annual population targets.</li>
            <li><strong>Reports:</strong> Track monthly immunization progress across different vaccines (BCG, OPV, Penta, etc.).</li>
            <li><strong>Backups:</strong> Use the "Export Full Backup" feature in Settings regularly to ensure data safety.</li>
        </ul>

        <div class="notice">
            <strong>Important:</strong> Since data is stored in the browser's LocalStorage, clearing browser history or cache may delete local reports if they haven't been synced to the cloud.
        </div>

        <h2>3. Cloud Synchronization</h2>
        <p>To enable cloud sync, provide a Firebase Realtime Database configuration in the Settings panel. This allows multiple institutions to submit data to a centralized supervisor dashboard.</p>

        <h2>4. Exporting Reports</h2>
        <p>Reports can be exported to Excel, Word, or PDF formats directly from the Reports Table. Ensure you select the correct period (Year/Month) before exporting.</p>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
