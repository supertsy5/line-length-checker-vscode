import * as vscode from 'vscode';

const LEVELS = ['Error', "Warn", "Info", "Hint"];

let disposables: vscode.Disposable[];
let diagCollection: vscode.DiagnosticCollection;

export function activate() {
	let config = vscode.workspace.getConfiguration('line-length-checker');
	let max = config.lineLength as number;
	let level = LEVELS.indexOf(config.level as string);
	let workspaceOnly = config.workspaceOnly as boolean;
	let blacklist = config.blacklist as string[];
	let blacklistFilters = (
		vscode.workspace.workspaceFolders?.flatMap(
			folder => blacklist.map(pattern => ({
				pattern: new vscode.RelativePattern(folder, pattern)
			}))
		) as vscode.DocumentFilter[] ?? []
	).concat({scheme: 'git'}, {scheme: 'vscode'}, {scheme: 'vscode-userdata'});
	let workspaceFilters = vscode.workspace.workspaceFolders?.map(
		folder => ({pattern: new vscode.RelativePattern(folder, '*')})
	);

	diagCollection = vscode.languages.createDiagnosticCollection('overlength');

	vscode.workspace.textDocuments.forEach(document => {
		checkOverlength(document);
	});

	disposables = [
		vscode.commands.registerCommand('line-length-checker.reload', reload),
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document !== undefined) {
				checkOverlength(event.document);
			}
		}),
		vscode.workspace.onDidOpenTextDocument(document => {
			checkOverlength(document);
		})
	];

	function reload() {
		const config = vscode.workspace.getConfiguration(
			'line-length-checker'
		);
		max = config.lineLength;
		workspaceOnly = config.workspaceOnly;
		blacklist = config.blacklist;
		level = LEVELS.indexOf(config.level);
		console.log(level);
		diagCollection.clear();
		vscode.workspace.textDocuments.forEach(document => {
			checkOverlength(document);
		});
	}

	function checkOverlength(
		document: vscode.TextDocument
	) {
		if(
			(
				workspaceOnly && workspaceFilters
				&& !vscode.languages.match(workspaceFilters, document)
			) || vscode.languages.match(blacklistFilters, document)
		) {
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
						level
					)
				);
			}
			i++;
		}
		diagCollection.set(document.uri, diags);
	}
}

export function deactivate() {
	diagCollection.clear();
	disposables.forEach(disp => disp.dispose());
}