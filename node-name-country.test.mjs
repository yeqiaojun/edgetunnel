import test from 'node:test';
import assert from 'node:assert/strict';
import { 获取IP国家名称, 格式化节点备注附加国家, 预热IP国家缓存 } from './_worker.js';

function createKVMock(initialEntries = []) {
	const store = new Map(initialEntries);
	return {
		store,
		async get(key) {
			return store.has(key) ? store.get(key) : null;
		},
		async put(key, value) {
			store.set(key, value);
		}
	};
}

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

test('优先使用 KV 缓存避免外部请求', async () => {
	const kv = createKVMock([['geoip:9.9.9.9', '加拿大']]);
	const result = await 获取IP国家名称('9.9.9.9', kv, async () => {
		throw new Error('should not fetch');
	});
	assert.equal(result, '加拿大');
});

test('批量预热会去重 IP 并写入 KV', async () => {
	const kv = createKVMock();
	const calls = [];
	const geoFetcher = async (url, init) => {
		calls.push({ url, body: init?.body });
		return {
			ok: true,
			async json() {
				return [
					{ status: 'success', country: 'United States', countryCode: 'US' },
					{ status: 'success', country: 'Australia', countryCode: 'AU' }
				];
			}
		};
	};
	await 预热IP国家缓存(['8.8.8.8#A', '1.1.1.1#B', 'example.com#C', '8.8.8.8#D'], kv, geoFetcher);
	assert.equal(calls.length, 1);
	assert.match(calls[0].url, /ip-api\.com\/batch/);
	assert.equal(await kv.get('geoip:8.8.8.8'), '美国');
	assert.equal(await kv.get('geoip:1.1.1.1'), '澳大利亚');
});
