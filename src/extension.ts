import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	let config = vscode.workspace.getConfiguration('line-length-checker');
	let max = config.lineLength as number;
	let blacklist = config.blacklist as string[];
	let filters = (
		vscode.workspace.workspaceFolders?.flatMap(
			wsf => blacklist.map(pattern => ({
				pattern: new vscode.RelativePattern(wsf, pattern),
				scheme: 'file'
			}))
		) as vscode.DocumentFilter[] ?? []
	).concat({scheme: 'git'}, {scheme: 'vscode'});

	let collection = vscode.languages.createDiagnosticCollection('overlength');

	vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document !== undefined) {
			checkOverlength(event.document);
		}
	});
	vscode.workspace.onDidOpenTextDocument(document => {
		checkOverlength(document);
	});
	vscode.workspace.textDocuments.forEach(document => {
		checkOverlength(document);
	});

	function checkOverlength(
		document: vscode.TextDocument
	) {
		if(vscode.languages.match(filters, document)) {
			console.log("Skipped: " + document.uri.toString());
			return;
		}
		console.log("Checking: " + document.uri.toString());
		let diags: vscode.Diagnostic[] = [];
		let tabSize = vscode.window.activeTextEditor?.options.tabSize;
		tabSize = typeof tabSize === 'number' ? tabSize : 1;
		let i = 0;
		while (i < document.lineCount) {
			const text = document.lineAt(i).text;
			const rawLength = text.length;
			const length = text.replaceAll('\t', " ".repeat(tabSize)).length;
			if (length > max) {
				diags.push(
					new vscode.Diagnostic(
						new vscode.Range(
							new vscode.Position(i, max - (length - rawLength)),
							new vscode.Position(i, rawLength)
						),
						`Overlength line: ${length} columns`,
						vscode.DiagnosticSeverity.Warning
					)
				);
			}
			i++;
		}
		collection.set(document.uri, diags);
	}
}