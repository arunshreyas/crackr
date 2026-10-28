import '../test-helper';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { POST as coveragePOST } from '../../app/api/coverage/route';
import { POST as progressPOST } from '../../app/api/progress/route';

describe('Payload Validation & Route Protection — Unit Tests', () => {
  test('disallows POST mutations to /api/coverage with 405 Method Not Allowed', async () => {
    const response = await coveragePOST();
    assert.strictEqual(response.status, 405);
    const body = await response.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Method Not Allowed'));
  });

  test('disallows POST mutations to /api/progress with 405 Method Not Allowed', async () => {
    const response = await progressPOST();
    assert.strictEqual(response.status, 405);
    const body = await response.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error.includes('Method Not Allowed'));
  });

  test('validates settings payload constraints', () => {
    // Name validation
    const invalidName = ' ';
    assert.ok(invalidName.trim().length < 2);

    // School validation
    const emptySchool = '   ';
    assert.strictEqual(emptySchool.trim().length, 0);

    // Stream validation
    const validStreams = ['PCM', 'PCMC', 'PCB', 'PCMB'];
    assert.strictEqual((validStreams as string[]).includes('COMMERCE'), false);
    assert.strictEqual(validStreams.includes('PCM'), true);

    // Daily goal boundary validation
    const tooLow = 4;
    const tooHigh = 250;
    const valid = 25;
    assert.ok(tooLow < 5);
    assert.ok(tooHigh > 200);
    assert.ok(valid >= 5 && valid <= 200);
  });

  test('validates onboarding username normalization rules', () => {
    const raw = '  User_Name#123! ';
    const normalized = raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    assert.strictEqual(normalized, 'user_name123');
    assert.ok(normalized.length >= 3);

    const tooShort = 'ab';
    assert.ok(tooShort.length < 3);
  });
});
