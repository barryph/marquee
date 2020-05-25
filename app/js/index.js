const util = require('util');
const path = require('path');
const marked = require('marked');
const Store = require('electron-store');
const Split = require('split.js');

const store = new Store({
	name: 'notes',
});

let noteTextarea = document.getElementsByClassName('js--note-textarea')[0];
let markdownContainer = document.getElementsByClassName('js--markdown-html')[0];
let addNewNoteButton = document.getElementsByClassName('js--new-note')[0];
let notesDiv = document.getElementsByClassName('js--notes')[0];

let openNoteId = null;


// Vex setup
vex.defaultOptions.className = 'vex-theme-plain';

/**
 * Altereted version of: https://davidwalsh.name/javascript-debounce-function
 *
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 */
function debounce(func, wait, immediate) {
	var timeout;
	return function(callAndClear=false) {
		if (callAndClear) {
			clearTimeout(timeout);
			return func.apply(context, args);
		}
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

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
				name: input.name,
			});
		},
	});
}

/**
 * Create and save a new note
 *
 * @param {Object} data
 */

async function newNote(data) {
	const notes = store.get('notes');
	const note = {
		id: generateUniqueNoteId(notes),
		name,
		tags: [],
		description: '',
		content: '',
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
	if (openNoteId) {
		await saveCurrentNoteDebounce(true);
	}

	const note = getNote(id);


	// Set class of "current" on sidebar item
	let previouslySelected = notesDiv.getElementsByClassName('current')[0];
	let newlySelected = notesDiv.querySelector(`li[data-id='${id}']`);

	if (previouslySelected) {
		previouslySelected.classList.remove('current');
	}

	newlySelected.classList.add('current');


	noteTextarea.focus();
	noteTextarea.value = note.content;
	noteTextarea.setSelectionRange(0, 0);
	openNoteId = id;

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
	let notes = store.get('notes');
	const note = notes.find(note => note.id === id);
	notes = notes.filter((note) => note.id !== id );
	store.set('notes',  notes);

	openNoteId = null;
	removeNoteFromSidebar(note.id);

	await openNote(notes[0].id);
}

/**
 * Save currently open note
 */

async function saveCurrentNote() {
	if (!openNoteId) {
		console.warn('No note is open to save');
		return;
	}


	const note = getNote(openNoteId);
	note.content = noteTextarea.value;

	const notes = store.get('notes');
	const noteIndex = notes.findIndex(item => item.id === note.id);
	notes.splice(noteIndex, 1, note);
	store.set('notes',  notes);
}

const saveCurrentNoteDebounce = debounce(saveCurrentNote, 2000);

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

	p.textContent = note.description || htmlEscapeToText(marked(note.content).substring(0, 50));

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
 *
 * @param {String} id
 */

function selectNote(id) {
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


Split(['.js--markdown', '.js--markdown-html'], {
	sizes: [50, 50],
	gutterSize: 11,
	gutter(index, direction) {
    const wrapper = document.createElement('div');
    wrapper.className = `gutter-wrapper gutter-${direction}`;
    const gutter = document.createElement('div');
    gutter.className = 'gutter';
		wrapper.appendChild(gutter);
    return wrapper;
	},
});

noteTextarea.addEventListener('input', () => saveCurrentNoteDebounce());

new Promise(async (resolve, reject) => {
	const notes = store.get('notes');
	await Promise.all(notes.map((note) => addNoteToSidebar(note)));
	await openNote(notes[0].id);
	resolve();
})
.then(() => {
	addNewNoteButton.addEventListener('click', newNotePrompt);
	noteTextarea.addEventListener('input', renderMarkdown);
});
