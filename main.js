const { app, BrowserWindow } = require('electron');
const server = require('./server');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 800,
    title: 'AI Learning Harness',
    webPreferences: { contextIsolation: true },
  });
  win.loadURL('http://localhost:4100');
}

app.whenReady().then(() => {
  server.listen(4100, () => createWindow());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
