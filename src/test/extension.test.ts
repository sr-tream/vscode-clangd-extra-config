import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ClangdArguments } from '../args';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('set keeps similarly prefixed arguments separate', async () => {
		const args = new ClangdArguments();

		await args.set('header-insertion-decorators', '1');
		await args.set('header-insertion', 'never');

		assert.deepStrictEqual((args as any).args, [
			'--header-insertion-decorators=1',
			'--header-insertion=never'
		]);
	});

	test('merge removes managed arguments that are no longer set', () => {
		const merged = (ClangdArguments as any).merge(
			['--parse-forwarding-functions=0'],
			['--malloc-trim=1', '--parse-forwarding-functions=1', '--unmanaged=value'],
			new Set<string>(['--malloc-trim', '--parse-forwarding-functions'])
		);

		assert.deepStrictEqual(merged, [
			'--unmanaged=value',
			'--parse-forwarding-functions=0'
		]);
	});

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
