import * as vscode from 'vscode';

import { Config, BackgroundIndex } from './config';

function bool2string(value: boolean): string {
    return value ? '1' : '0';
}

export class ClangdArguments {
    private args: string[] = [];

    constructor() {
    }

    async set(argName: string, value?: string) {
        const fullName = (argName.length > 1 ? '--' : '-') + argName;

        let argIdx = this.args.findIndex(arg => arg.trimStart().startsWith(fullName));
        if (argIdx >= 0) {
            let curValue = this.args[argIdx].trimStart().substring(fullName.length).trim();
            if (curValue.startsWith('=')) curValue = curValue.substring(1);
            else if (curValue.length === 0) curValue = '1';

            if (value === undefined)
                this.args.splice(argIdx, 1);
            else if (curValue !== value)
                this.args[argIdx] = `${fullName}=${value}`;

            return;
        }

        if (value === undefined) return;

        this.args.push(`${fullName}=${value}`);
    }

    async setFeatures(features: Config.features) {
        this.set('all-scopes-completion', bool2string(features.allScopesCompletion));

        const bgIndex = features.backgroundIndex;
        this.set('background-index', bool2string(bgIndex !== BackgroundIndex.disabled));
        if (bgIndex !== BackgroundIndex.disabled)
            this.set('background-index-priority', bgIndex);

        this.set('clang-tidy', bool2string(features.clangTidy));
        this.set('completion-parse', features.completionParse);
        this.set('completion-style', features.completionStyle);
        this.set('debug-origin', bool2string(features.debugOrigin));
        this.set('fallback-style', features.fallbackStyle);
        this.set('function-arg-placeholders', bool2string(features.functionArgPlaceholders));
        this.set('header-insertion', features.headerInsertion);
        this.set('header-insertion-decorators', bool2string(features.headerInsertionDecorators));
        this.set('import-insertions', bool2string(features.importInsertions));
        this.set('include-ineligible-results', bool2string(features.includeIneligibleResults));
        this.set('limit-references', features.limitReferences.toString());
        this.set('limit-results', features.limitResults.toString());
        this.set('ranking-model', features.rerankingModel);
        this.set('rename-file-limit', features.renameFileLimits.toString());
    }

    async setMiscellaneous(miscellaneous: Config.miscellaneous) {
        const workers = miscellaneous.workerThreads;
        if (workers < 0) {
            this.set('j');
            this.set('sync');
        } else if (workers > 0) {
            this.set('j', workers.toString());
            this.set('sync');
        } else {
            this.set('j');
            this.set('sync', "true");
        }

        this.set('malloc-trim', bool2string(miscellaneous.mallocTrim));
        this.set('parse-forwarding-functions', bool2string(miscellaneous.parseForwardingFunctions));
        this.set('pch-storage', miscellaneous.pchStorage);
        this.set('use-dirty-headers', bool2string(miscellaneous.useDirtyHeaders));
    }

    async write(): Promise<boolean> {
        let config = vscode.workspace.getConfiguration("clangd");
        const args = config.get<string[]>('arguments', []);
        const merged = ClangdArguments.merge(this.args, args);

        if (args === merged) return false;

        config.update('arguments', this.args, vscode.ConfigurationTarget.Workspace);
        return true;
    }

    private static merge(from: string[], to: string[]): string[] {
        for (const frArg in from) {
            const frKey = frArg.indexOf('=') !== -1 ? frArg.substring(0, frArg.indexOf('=')).trim() : frArg;
            let toKeyId = to.findIndex(arg => arg.trimStart().startsWith(frKey));
            if (toKeyId == -1) to.push(frArg);
            else if (frArg !== to[toKeyId]) to[toKeyId] = frArg;
        }

        return to;
    }
};