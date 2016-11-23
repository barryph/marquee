const fs = require('fs');
const storage = require('electron-json-storage');
const path = require('path');

const markdownSaveDirectory = 'markdown-files'

let markdownInput = document.getElementById('markdownInput');
let saveButton = document.getElementById('saveButton');
let addNewNoteButton = document.getElementById('addNewNote');
let notesDiv = document.getElementById('notes');
let currentNote;


// Vex setup
vex.defaultOptions.className = 'vex-theme-plain';
//vex.dialog.buttons.CREATE = vex.dialog.buttons.YES;
//vex.dialog.buttons.CREATE.text = 'Create';


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

function newNote(noteName, markup="") {
	let newNote = {
			name: noteName,
			tags: [],
			description: '',
	};

	storage.get('notes', (err, data) => {
		let notes = data.notes;

		let nameTaken = false;
		for (let i = 0; i < notes.length; i++) {
			if (notes[i].name === newNote.name) {
				nameTaken = true;
				break;
			}
		}

		if (nameTaken) {
			vex.dialog.alert({
				message: 'Note already exists with that name',
			});
			return;
		}

		let updatedNotes = { notes };
		updatedNotes.notes.push(newNote);

		storage.set('notes', updatedNotes, (err) => {
			fs.writeFile(path.join(markdownSaveDirectory, newNote.name), markup, (err) => {
				addNoteToSidebar(newNote);
				openNote(newNote.name);
			});
		});
	});
}

function openNote(noteName) {
	// Must be defined before attempting to read file
	// in case the file has not been created yet as is the case for the default file
	setCurrentNote(noteName);

	fs.readFile(path.join(markdownSaveDirectory, noteName), { encoding: 'utf8' }, (err, data) => {
		if (err) throw err;

		markdownInput.focus();
		markdownInput.value = data;
		markdownInput.setSelectionRange(0, 0);
	});
}

function saveCurrentNote() {
	saveNote(currentNote);
}

function saveNote(noteName) {
	let markdown = markdownInput.value;
	fs.writeFile(path.join(markdownSaveDirectory, noteName), markdown);
}

function addNoteToSidebar(note) {
	let li = document.createElement('li');
	let header = document.createElement('header');
	let p = document.createElement('p');

	li.setAttribute('data-name', note.name);
	header.textContent = note.name;
	p.textContent = note.description;

	li.appendChild(header);
	li.appendChild(p);
	li.addEventListener('click', openNote.bind(li, note.name));

	notesDiv.appendChild(li);
}

function setCurrentNote(noteName) {
	let previouslySelected = notesDiv.getElementsByClassName('current')[0]
	let selectedSidebarElem = notesDiv.querySelector(`li[data-name='${noteName}'`);

	if (previouslySelected) {
		previouslySelected.classList.remove('current');
	}

	selectedSidebarElem.classList.add('current');

	currentNote = noteName;
}

Split(['.markdown', '.renderedMarkdown']);

new Promise((resolve, reject) => {
	storage.get('notes', (err, data) => {
		// Create a default note if none exist already

		if (!Object.keys(data).length || !data.notes.length) {
			let noteName = 'hello-world';
			let note = {
				name: noteName,
				tags: ['Learning', 'Memory'],
				description: 'Amet itaque officiis quibusdam ex exercitationem placeat',
			};

			addNoteToSidebar(note);
			setCurrentNote(note.name);

			storage.set('notes', { notes: [note] }, (err) => {
				if (err) throw err;
			});

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
	addNewNoteButton.addEventListener('click', newNotePrompt);
});
