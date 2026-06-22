import test from 'node:test';
import assert from 'node:assert/strict';
import { 格式化节点备注附加国家 } from './_worker.js';

test('IP 节点追加中文国家名', async () => {
	const result = await 格式化节点备注附加国家('原节点名', '8.8.8.8', async () => '美国');
	assert.equal(result, '美国 | 原节点名');
});

test('域名节点保持原备注', async () => {
	const result = await 格式化节点备注附加国家('原节点名', 'example.com', async () => '美国');
	assert.equal(result, '原节点名');
});

test('国家解析失败时回退原备注', async () => {
	const result = await 格式化节点备注附加国家('原节点名', '8.8.8.8', async () => '');
	assert.equal(result, '原节点名');
});
