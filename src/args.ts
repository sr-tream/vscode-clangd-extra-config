import * as vscode from 'vscode';

import { Config, BackgroundIndex } from './config';

function bool2string(value: boolean): string {
    return value ? '1' : '0';
}

export class ClangdArguments {
    private wait: number;
    private args: string[] = [];
    private changed: boolean = false;

    constructor(wait: number = 10) {
        this.wait = wait;
    }

    async set(argName: string, value?: string) {
        const fullName = (argName.length > 1 ? '--' : '-') + argName;
        this.changed = true;

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
        if (!this.changed) return false;
        this.changed = false;

        let config = vscode.workspace.getConfiguration("clangd");
        const args = config.get<string[]>('arguments', []);
        const merged = ClangdArguments.merge(this.args, args);

        if (ClangdArguments.isEqual(args, merged))
            return false;

        await config.update('arguments', merged, vscode.ConfigurationTarget.Workspace);
        await ClangdArguments.sleep(this.wait);
        if (!ClangdArguments.isEqual(vscode.workspace.getConfiguration("clangd").get<string[]>('arguments', []), merged)) {
            this.changed = true;
            return this.write();
        }
        return true;
    }

    private static merge(from: string[], to: string[]): string[] {
        let result = [...to];
        for (const frArg of from) {
            const frKey = frArg.indexOf('=') !== -1 ? frArg.substring(0, frArg.indexOf('=')).trim() : frArg;
            const toKeyId = result.findIndex(arg => arg.trimStart().startsWith(frKey));
            if (toKeyId === -1) result.push(frArg);
            else if (frArg !== result[toKeyId]) result[toKeyId] = frArg;
        }

        return result;
    }

    private static isEqual(lhs: string[], rhs: string[]): boolean {
        if (lhs.length !== rhs.length) return false;

        for (const arg of lhs) {
            if (rhs.indexOf(arg) === -1)
                return false;
        }
        return true;
    }

    private static async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};