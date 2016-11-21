const fs = require('fs');

let markdownInput = document.getElementById('markdownInput');
let saveButton = document.getElementById('saveButton');

function loadFile(filename) {
	fs.readFile(`markdown-files/${filename}`, (err, data) => {
		if (err) throw err;

		markdownInput.value = data;
	});
}

function saveCurrentNote() {
	// Get name of current note and save the markdown
	let noteName = 'hello-world';
	saveFile(noteName);
}

function saveFile(filename) {
	let markdown = markdownInput.value;
	fs.writeFile(`markdown-files/${filename}`, markdown);
}


saveButton.addEventListener('click', saveCurrentNote);


let lastEdited = null;
loadFile(lastEdited || 'hello-world');

Split(['.markdown', '.renderedMarkdown']);
