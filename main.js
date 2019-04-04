const {app, BrowserWindow} = require('electron');
const path = require('path');
const Store = require('electron-store');
const defaultNote = require('./app/defaultNote.js');

const store = new Store({
	name: 'notes',
});

const notes = store.get('notes');

// Create default notes
if (!notes) {
	store.set('notes', [defaultNote]);
}


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
