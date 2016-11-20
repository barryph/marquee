const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');
const electronConnectClient = require('electron-connect').client;


let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 650,
		center: true,
	});

	mainWindow .loadURL(`file://${__dirname}/app/index.html`);

	mainWindow.webContents.openDevTools();

	mainWindow.on('closed', () => {
		mainWindow = null;
	});

	electronConnectClient.create(mainWindow);
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
