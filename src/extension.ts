import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	let collection = vscode.languages.createDiagnosticCollection('overlength');
	vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document !== undefined) {
			checkOverlength(collection, event.document);
		}
	});
	vscode.workspace.onDidOpenTextDocument(document => {
		checkOverlength(collection, document);
	});
	vscode.workspace.textDocuments.forEach(document => {
		checkOverlength(collection, document);
	});
}
export function deactivate() {}

function checkOverlength(
	set: vscode.DiagnosticCollection,
	document: vscode.TextDocument
) {
	if(document.uri.path.endsWith('.git')){
		return;
	}
	console.log("Checking: " + document.uri.toString());
	let config = vscode.workspace.getConfiguration('line-length-highlighter');
	let max = config.lineLength;
	let i = 0;
	let diags: vscode.Diagnostic[] = [];
	while (i < document.lineCount) {
		let length = document.lineAt(i).text.length;
		if (length >= max) {
			diags.push(
				new vscode.Diagnostic(
					new vscode.Range(
						new vscode.Position(i, 0),
						new vscode.Position(i, length)
					),
					`Overlength line: ${length} chars`,
					vscode.DiagnosticSeverity.Warning
				)
			);
		}
		i++;
	}
	set.set(document.uri, diags);
}