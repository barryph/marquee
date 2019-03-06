const fs = require('fs');
const storage = require('electron-json-storage');
const path = require('path');
const marked = require('marked');

let markdownInput = document.getElementById('markdownInput');
let markdownContainer = document.getElementById('renderedMarkdown');
let saveButton = document.getElementById('saveButton');
let deleteButton = document.getElementById('deleteButton');
let addNewNoteButton = document.getElementsByClassName('js--new-note')[0];
let notesDiv = document.getElementById('notes');


// Vex setup
vex.defaultOptions.className = 'vex-theme-plain';


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

			newNote(input.name);
		},
	});
}

/**
 * Create and save a new note
 * 
 * @param {String} noteName
 * @param {String} markup
 */

function newNote(noteName, markup="") {
	let newNote = {
		name: noteName,
		tags: [],
		description: '',
	};

	storage.get('notes', (err, data) => {
		let notes = data.notes || [];
		let nameTaken = false;

		const nameTaken = notes.any(note => note.name === newNote.name);

		if (nameTaken) {
			vex.dialog.alert({
				message: 'Note already exists with that name',
			});
			return;
		}

		let updatedNotes = { notes };
		updatedNotes.notes.splice(newNote);

		storage.set('notes', updatedNotes, (err) => {
			fs.writeFile(markdownLocation(newNote.name), markup, { flag: 'wx' }, (err) => {
				addNoteToSidebar(newNote);
				openNote(newNote.name);
			});
		});
	});
}

/**
 * Render current markdown into html and display in preview panel
 */

function renderMarkdown() {
		markdown = marked(markdownInput.value);
		markdownContainer.innerHTML = markdown;

		let codeBlocks = document.querySelectorAll('pre code');
		for (let block of codeBlocks) {
			hljs.highlightBlock(block);
		}
}

/**
 * Open note with name "noteName"
 * 
 * @param {String} noteName
 */

function openNote(noteName) {
	// Must be defined before attempting to read file
	// in case the file has not been created yet as is the case for the default file
	selectNote(noteName);

	fs.readFile(markdownLocation(noteName), { encoding: 'utf8' }, (err, data='') => {
		if (err && err.code !== 'ENOENT') throw err;

		markdownInput.focus();
		markdownInput.value = data;
		markdownInput.setSelectionRange(0, 0);

		renderMarkdown();
	});
}

/**
 * Prompt user to delete currently open note
 */

function deleteNotePrompt() {
	vex.dialog.confirm({
		message: 'Are you sure you want to delete this note?',
		callback(confirmed) {
			if (!confirmed) return;

			let noteElem = notesDiv.getElementsByClassName('current')[0];
			let noteName = noteElem.getAttribute('data-name');

			deleteNote(noteName);
		},
	});
}

/**
 * Delete note with name "noteName"
 * 
 * @param {String} noteName
 */

function deleteNote(noteName) {
	storage.get('notes', (err, data) => {
		let notes = data.notes || [];

		notes = notes.filter((note) => {
			return note.name !== noteName;
		});
		data = { notes };

		storage.set('notes',  data, (err) => {
			if (err) throw err;

			fs.unlink(markdownLocation(noteName), (err) => {
				if (err && err.code !== 'ENOENT') throw err;

				removeNoteFromSidebar(noteName);
				openNote(notes[0].name);
			});
		});
	});
}

/**
 * Get the name of the currently open note and pass it to the saveNote function
 */

function saveCurrentNote() {
	let noteElem = notesDiv.getElementsByClassName('current')[0];
	let noteName = noteElem.getAttribute('data-name');

	saveNote(noteName);
}

/**
 * Save note with name "noteName" to disk
 * 
 * @param {String} noteName
 */

function saveNote(noteName) {
	let markdown = markdownInput.value;
	fs.writeFile(markdownLocation(noteName), markdown);
}

/**
 * Add a new item to the sidebar with the given data
 * 
 * @param {Object} note
 */

function addNoteToSidebar(note) {
	let li = document.createElement('li');
	let header = document.createElement('header');
	let p = document.createElement('p');

	li.classList.add('sidebar__item');
	li.classList.add('sidebar__note');
	li.setAttribute('data-name', note.name);
	header.textContent = note.name;

	fs.readFile(markdownLocation(note.name), { encoding: 'utf8' }, (err, data='') => {
		if (err && err.code !== 'ENOENT') throw err;
		p.textContent = note.description || htmlEscapeToText(marked(data).substring(0, 50));

		li.appendChild(header);
		li.appendChild(p);

		li.addEventListener('click', openNote.bind(li, note.name));

		notesDiv.appendChild(li);
	});
}

/**
 * Remove item by the name of "noteName" from the sidebar
 * 
 * @param {String} noteName
 */

function removeNoteFromSidebar(noteName) {
	let selectedSidebarElem = notesDiv.getElementsByClassName('current')[0];
	selectedSidebarElem.parentElement.removeChild(selectedSidebarElem);
}

/**
 * Set class of "current" on sidebar item by the name of "noteName"
 * 
 * @param {String} noteName
 */

function selectNote(noteName) {
	let previouslySelected = notesDiv.getElementsByClassName('current')[0];
	let selectedSidebarElem = notesDiv.querySelector(`li[data-name='${noteName}']`);

	if (previouslySelected) {
		previouslySelected.classList.remove('current');
	}

	selectedSidebarElem.classList.add('current');
}

/**
 * Cross-plaform method to get the save path for markdown files
 * 
 * @param {String} noteName
 * @return {String}
 */

function markdownLocation(noteName) {
	const saveDirectory = 'markdown-files';
	return path.join(saveDirectory, noteName) + '.md';
}


Split(['.markdown', '#renderedMarkdown'], {
	gutterSize: 1,
});

new Promise((resolve, reject) => {
	storage.get('notes', (err, data) => {
		// Create a default note if none exist already
		if (!Object.keys(data).length || !data.notes.length) {
			let noteName = 'Welcome';
			let note = {
				name: noteName,
				tags: ['Introduction', 'Learning'],
				description: 'Getting started with Markdown.',
			};

			newNote(noteName);

			return resolve();
		}

		let notes = data.notes;

		for (note of notes) {
			addNoteToSidebar(note);
		}

		let lastEdited = null;
		openNote(lastEdited || notes[0].name);

		resolve();
	});
})
.then(() => {
	saveButton.addEventListener('click', saveCurrentNote);
	deleteButton.addEventListener('click', deleteNotePrompt);
	addNewNoteButton.addEventListener('click', newNotePrompt);
	markdownInput.addEventListener('input', renderMarkdown);
});
