const util = require('util');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const Store = require('electron-store');

const fs_readFile = util.promisify(fs.readFile);
const fs_writeFile = util.promisify(fs.writeFile);
const fs_unlink = util.promisify(fs.unlink);

const store = new Store({
	name: 'notes',
});

let noteTextarea = document.getElementsByClassName('js--note-textarea')[0];
let markdownContainer = document.getElementsByClassName('js--markdown-html')[0];
let addNewNoteButton = document.getElementsByClassName('js--new-note')[0];
let notesDiv = document.getElementsByClassName('js--notes')[0];


// AUTO SAVE ON EDIT


// Vex setup
vex.defaultOptions.className = 'vex-theme-plain';

const getNote = (id) => store.get('notes').find((note) => note.id === id);

const generateId = () => Math.random().toString(36).substr(2, 16);

function generateUniqueNoteId(notes) {
	const id = generateId();
	const idTaken = notes.some(note => note.id === id);

	if (idTaken) {
		return generateUniqueNoteId(notes);
	}

	return id;
}


function htmlEscapeToText(text) {
	return text.replace(/\&\#[0-9]*;|&amp;/g, function (escapeCode) {
		if (escapeCode.match(/amp/)) {
			return '&';
		}
		return String.fromCharCode(escapeCode.match(/[0-9]+/));
	});
}


/**
 * Prompt user to create a new note
 */

function newNotePrompt() {
	vex.dialog.open({
		input: '<input name="name" type="text" placeholder="Note Name" required>',
		callback(input) {
			if (!input) return;

			if (!input.name.trim()) {
				vex.dialog.alert({
					message: 'Note name cannot be blank',
					callback: newNotePrompt,
				});
				return;
			}

			newNote({
				name: input.name
			});
		},
	});
}

/**
 * Create and save a new note
 * 
 * @param {String} name
 * @param {String} markup
 */

async function newNote(data, markup="") {
	const notes = store.get('notes') || [];
	const note = {
		id: generateUniqueNoteId(notes),
		name,
		tags: [],
		description: '',
		...data,
	};

	const nameTaken = notes.some(item => item.name === note.name);

	if (nameTaken) {
		vex.dialog.alert({
			message: 'Note already exists with that name',
		});
		return;
	}

	notes.push(note);
	store.set('notes', notes);

	try {
		await fs_writeFile(markdownLocation(note.name), markup, { flag: 'wx' });
	} catch (err) {
		if (err.code !== 'EEXIST') throw err;
	}

	await addNoteToSidebar(note);
	await openNote(note.id);
}

/**
 * Render current markdown into html and display in preview panel
 */

function renderMarkdown() {
		markdown = marked(noteTextarea.value);
		markdownContainer.innerHTML = markdown;

		let codeBlocks = document.querySelectorAll('pre code');
		for (let block of codeBlocks) {
			hljs.highlightBlock(block);
		}
}

/**
 * Open note
 * 
 * @param {String} id
 */

async function openNote(id) {
	selectNote(id);

	const note = getNote(id);
	let data = '';

	try {
		data = await fs_readFile(markdownLocation(note.name), { encoding: 'utf8' });
	} catch (err) {
		if (err && err.code !== 'ENOENT') throw err;
	}

	noteTextarea.focus();
	noteTextarea.value = data;
	noteTextarea.setSelectionRange(0, 0);

	renderMarkdown();
}

/**
 * Prompt user to delete currently open note
 */

function deleteNotePrompt() {
	vex.dialog.confirm({
		message: 'Are you sure you want to delete this note?',
		async callback(confirmed) {
			if (!confirmed) return;

			let noteElem = notesDiv.getElementsByClassName('current')[0];
			let noteId = noteElem.getAttribute('data-id');

			deleteNote(noteId);
		},
	});
}

/**
 * Delete note
 * 
 * @param {String} id
 */

async function deleteNote(id) {
	let notes = store.get('notes') || [];
	const note = notes.find(note => note.id === id);
	notes = notes.filter((note) => note.id !== id );
	store.set('notes',  notes);

	try {
		await fs_unlink(markdownLocation(note.name));
	} catch (err) {
		if (err && err.code !== 'ENOENT') throw err;
	}

	removeNoteFromSidebar(note.id);
	await openNote(notes[0].id);
}

/**
 * Save note to disk
 * 
 * @param {String} id
 */

async function saveNote(id) {
	const markdown = noteTextarenoteTextarea.value;
	const note = getNote(id);
	await fs_writeFile(markdownLocation(note.name), markdown);
}

/**
 * Add a new item to the sidebar with the given data
 * 
 * @param {Object} note
 */

async function addNoteToSidebar(note) {
	let li = document.createElement('li');
	let header = document.createElement('header');
	let p = document.createElement('p');
	//let cross = document.createElement('span');
	let deleteButton = document.createElement('img');

	li.classList.add('sidebar__item');
	li.classList.add('sidebar__note');
	li.setAttribute('data-id', note.id);
	header.textContent = note.name;
	deleteButton.setAttribute('src', 'img/trash.svg');
	deleteButton.classList.add('button--delete');
	//cross.innerHTML = '&#10005;';
	//cross.classList.add('button--delete');

	let data = '';

	try {
		data = await fs_readFile(markdownLocation(note.name), { encoding: 'utf8' });
	} catch (err) {
		if (err && err.code !== 'ENOENT') throw err;
	}

	p.textContent = note.description || htmlEscapeToText(marked(data).substring(0, 50));

	//header.appendChild(cross);
	header.appendChild(deleteButton);
	li.appendChild(header);
	li.appendChild(p);

	li.addEventListener('click', openNote.bind(li, note.id));
	deleteButton.addEventListener('click', deleteNotePrompt);

	notesDiv.appendChild(li);
}

/**
 * Remove item from the sidebar
 * 
 * @param {String} id
 */

function removeNoteFromSidebar(id) {
	let sidebarElem = notesDiv.querySelector(`li[data-id='${id}']`);
	sidebarElem.parentElement.removeChild(sidebarElem);
}

/**
 * Set class of "current" on sidebar item
 * 
 * @param {String} id
 */

function selectNote(id) {
	let previouslySelected = notesDiv.getElementsByClassName('current')[0];
	let newlySelected = notesDiv.querySelector(`li[data-id='${id}']`);

	if (previouslySelected) {
		previouslySelected.classList.remove('current');
	}

	newlySelected.classList.add('current');
}

/**
 * Cross-plaform method to get the save path for markdown files
 * 
 * @param {String} name
 * @return {String}
 */

function markdownLocation(name) {
	const saveDirectory = 'markdown-files';
	return path.join(saveDirectory, name) + '.md';
}


Split(['.markdown', '.js--markdown-html'], {
	gutterSize: 1,
});

new Promise(async (resolve, reject) => {
	const notes = store.get('notes') || [];

	if (!notes.length) {
		let noteName = 'Welcome';
		let note = {
			name: noteName,
			tags: ['Introduction', 'Learning'],
			description: 'Getting started with Markdown.',
		};

		newNote(note);

		return resolve();
	}

	await Promise.all(notes.map((note) => addNoteToSidebar(note)));
	await openNote(notes[0].id);

	resolve();
})
.then(() => {
	addNewNoteButton.addEventListener('click', newNotePrompt);
	noteTextarea.addEventListener('input', renderMarkdown);
});
