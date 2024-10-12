import * as vscode from 'vscode';
import * as crypto from 'crypto';

import { ClangdArguments } from './args';
import { Config } from './config';

const CLANGD_EXTENSION = 'llvm-vs-code-extensions.vscode-clangd';
const CLANGD_COMMAND_RESTART = 'clangd.restart';
const WAIT_TIME_TO_APPLY_MS = 1000;

export function activate(context: vscode.ExtensionContext) {
	const hash = crypto.createHash('md5').update(context.extension.id).digest('hex');
	context.subscriptions.push(new ExtraConfigHandler((parseInt(hash, 16) % 1000) + 10));
}

export function deactivate() { }

class ExtraConfigHandler implements vscode.Disposable {
	private onDocumentChanged: vscode.Disposable;
	private onConfigurationChanged: vscode.Disposable;
	private clangdArgs: ClangdArguments;

	constructor(waitToUpdate: number = 10) {
		this.onDocumentChanged = vscode.window.onDidChangeActiveTextEditor((event) => this.didDocumentChange(event?.document));
		this.onConfigurationChanged = vscode.workspace.onDidChangeConfiguration((e) => this.didConfigurationChange(e));

		this.clangdArgs = new ClangdArguments(waitToUpdate);
		Config.read().then((config) => {
			this.clangdArgs.setFeatures(config.features);
			this.clangdArgs.setMiscellaneous(config.miscellaneous);
			this.clangdArgs.write().then((changed) => {
				if (!changed || !config.RestartServerOnChange) return;

				ExtraConfigHandler.doRestartClangd();
			});
		});
	}
	dispose() {
		this.onDocumentChanged.dispose();
		this.onConfigurationChanged.dispose();
	}

	private async didDocumentChange(document?: vscode.TextDocument) {
		const lang = document?.languageId || '';
		if (!['c', 'cpp', 'cuda-cpp', 'objective-c', 'objective-cpp'].includes(lang)) return;

		const changed = await this.clangdArgs.write();

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