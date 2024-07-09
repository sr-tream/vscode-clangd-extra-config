import * as vscode from 'vscode';

import { ClangdArguments } from './args';
import { Config } from './config';

const CLANGD_EXTENSION = 'llvm-vs-code-extensions.vscode-clangd';
const CLANGD_COMMAND_RESTART = 'clangd.restart';
const WAIT_TIME_TO_APPLY_MS = 1000;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new ExtraConfigHandler());
}

export function deactivate() { }

class ExtraConfigHandler implements vscode.Disposable {
	private onDocumentChanged: vscode.Disposable;
	private onConfigurationChanged: vscode.Disposable;
	private clangdArgs?: ClangdArguments;

	constructor() {
		this.onDocumentChanged = vscode.workspace.onDidChangeTextDocument((event) => this.didDocumentChange(event.document));
		this.onConfigurationChanged = vscode.workspace.onDidChangeConfiguration((e) => this.didConfigurationChange(e));

		this.clangdArgs = new ClangdArguments();
		Config.read().then((config) => {
			this.clangdArgs?.setFeatures(config.features);
			this.clangdArgs?.setMiscellaneous(config.miscellaneous);
			this.clangdArgs?.write().then((changed) => {
				delete this.clangdArgs;
				this.clangdArgs = undefined;
				if (!changed || !config.RestartServerOnChange) return;

				ExtraConfigHandler.doRestartClangd();
			});
		});
	}
	dispose() {
		this.onDocumentChanged.dispose();
		this.onConfigurationChanged.dispose();
	}

	private async didDocumentChange(document: vscode.TextDocument) {
		if (this.clangdArgs === undefined) return;

		const changed = await this.clangdArgs.write();
		delete this.clangdArgs;
		this.clangdArgs = undefined;

		if (!changed) return;

		const config = await Config.read();
		if (!config.RestartServerOnChange) return;

		ExtraConfigHandler.doRestartClangd();
	}
	private async didConfigurationChange(e: vscode.ConfigurationChangeEvent) {
		const changedClangdArgs = e.affectsConfiguration('clangd.arguments');
		const changedFeatureOptions = e.affectsConfiguration('clangd.extraConfig.features');
		const changedMiscellaneousOptions = e.affectsConfiguration('clangd.extraConfig.miscellaneous');
		if (!changedClangdArgs && !changedFeatureOptions && !changedMiscellaneousOptions) return;

		if (this.clangdArgs === undefined)
			this.clangdArgs = new ClangdArguments();
		const config = await Config.read();
		if (changedClangdArgs) {
			this.clangdArgs.setFeatures(config.features);
			this.clangdArgs.setMiscellaneous(config.miscellaneous);
			return;
		}

		if (changedFeatureOptions)
			this.clangdArgs.setFeatures(config.features);
		if (changedMiscellaneousOptions)
			this.clangdArgs.setMiscellaneous(config.miscellaneous);
	}

	private static doRestartClangd() {
		const clangdExtension = vscode.extensions.getExtension(CLANGD_EXTENSION);
		if (!clangdExtension || !clangdExtension.isActive) return;

		setTimeout(function () {
			vscode.commands.executeCommand(CLANGD_COMMAND_RESTART);
		}, WAIT_TIME_TO_APPLY_MS);
	}
};