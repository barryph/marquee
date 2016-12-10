const {app, BrowserWindow} = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 650,
		center: true,
	});

	if (process.env.ELECTRON_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	mainWindow .loadURL(`file://${__dirname}/app/index.html`);

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}


/* Application event listeners */

app.on('ready', createWindow);

app.on('activate', () => {
	if (mainWindow === null) {
		createWindow();
	}
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});
