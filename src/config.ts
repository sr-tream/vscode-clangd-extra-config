import * as vscode from 'vscode';

export enum BackgroundIndex {
    disabled = "disabled",
    background = "background",
    low = "low",
    normal = "normal"
};
export enum CompletionParse {
    auto = "auto",
    always = "always",
    never = "never"
};
export enum CompletionStyle {
    detailed = "detailed",
    bundled = "bundled"
};
export enum HeaderInsertion {
    iwyu = "iwyu",
    never = "never"
};
export enum RerankingModel {
    heuristics = "heuristics",
    decision_forest = "decision_forest"
};
export enum PchStorage {
    disk = "disk",
    memory = "memory"
};

export namespace Config {

    export interface features {
        allScopesCompletion: boolean;
        backgroundIndex: BackgroundIndex;
        clangTidy: boolean;
        completionParse: CompletionParse;
        completionStyle: CompletionStyle;
        debugOrigin: boolean;
        fallbackStyle: string;
        functionArgPlaceholders: boolean;
        headerInsertion: HeaderInsertion;
        headerInsertionDecorators: boolean;
        importInsertions: boolean;
        includeIneligibleResults: boolean;
        limitReferences: number;
        limitResults: number;
        rerankingModel: RerankingModel;
        renameFileLimits: number;
    };
    export const DEFAULT_FEATURES: features = {
        allScopesCompletion: true,
        backgroundIndex: BackgroundIndex.low,
        clangTidy: true,
        completionParse: CompletionParse.auto,
        completionStyle: CompletionStyle.detailed,
        debugOrigin: false,
        fallbackStyle: "LLVM",
        functionArgPlaceholders: true,
        headerInsertion: HeaderInsertion.iwyu,
        headerInsertionDecorators: true,
        importInsertions: false,
        includeIneligibleResults: false,
        limitReferences: 1000,
        limitResults: 100,
        rerankingModel: RerankingModel.decision_forest,
        renameFileLimits: 50
    }

    export interface miscellaneous {
        workerThreads: number;
        mallocTrim: boolean;
        parseForwardingFunctions: boolean;
        pchStorage: PchStorage;
        useDirtyHeaders: boolean;
    };
    export const DEFAULT_MISCELLANEOUS: miscellaneous = {
        workerThreads: -1,
        mallocTrim: true,
        parseForwardingFunctions: false,
        pchStorage: PchStorage.disk,
        useDirtyHeaders: false
    };

    export interface extraConfig {
        RestartServerOnChange: boolean;
        features: features;
        miscellaneous: miscellaneous;
    };
    export const DEFAULT_EXTRA_CONFIG: extraConfig = {
        RestartServerOnChange: false,
        features: DEFAULT_FEATURES,
        miscellaneous: DEFAULT_MISCELLANEOUS
    }

    export async function read(): Promise<extraConfig> {
        let config = vscode.workspace.getConfiguration("clangd");
        return await config.get<extraConfig>("extraConfig", DEFAULT_EXTRA_CONFIG);
    }
}