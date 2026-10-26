/*
 * Testa interface.html num navegador real, com os webhooks do n8n simulados.
 *
 *   npm install playwright
 *   node test/interface.test.mjs
 *
 * Use CHROME_PATH para apontar um Chromium ja instalado.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(path.join(HERE, '..', 'interface.html'), 'utf8');
const INTERFACE = '/webhook/7cb41a2d-d302-4bef-9d2e-fcc64f0788ed';
const PEOPLE = '/webhook/c7fe0be6-d5d8-4bd5-8308-e16398916e6f';
const CNPJ = '/webhook/3f0a5c21-9b7e-4d58-a0c6-71e2d4f8b913';
const SUBMIT = '/webhook/5e0f338d-9b2b-48dd-9d39-8dc301798212';

let peopleMode = 'ok';
let cnpjMode = 'ok';
let submitted = null;
const peopleCalls = [];
const cnpjCalls = [];

const PEOPLE_OK = {
  ok: true, term: 'tahata', count: 2, error: '', people: [
    { id: 'u-1', displayName: 'Tahata Eduardo', mail: 'Eduardo.Tahata2@br.bosch.com', department: 'MA/PUQ1-LA', jobTitle: 'Digital Specialist' },
    { id: 'u-2', displayName: 'Tahata Marina', mail: 'marina.tahata@br.bosch.com', department: 'MA/LOG', jobTitle: 'Analyst' },
  ],
};
const COMPANY_OK = {
  ok: true, error: '', company: {
    razaoSocial: 'ROBERT BOSCH LTDA', nomeFantasia: 'BOSCH CAMPINAS', situacao: 'ATIVA',
    municipio: 'CAMPINAS', uf: 'SP', atividadePrincipal: 'Fabricacao de pecas', cep: '13080-902',
  },
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const json = (payload) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(payload); };

    if (req.url.startsWith(PEOPLE)) {
      peopleCalls.push({ method: req.method, q: new URL(req.url, 'http://x').searchParams.get('q') });
      if (peopleMode === 'empty') return json('{"ok":true,"count":0,"people":[],"error":""}');
      if (peopleMode === 'graph') return json('{"ok":false,"people":[],"error":"Invalid filter clause"}');
      if (peopleMode === 'legacy') return json('[{"displayName":"Tahata Eduardo","mail":"e.t@bosch.com","department":"MA/PUQ1-LA"}]');
      if (peopleMode === 'http500') { res.writeHead(500); return res.end('boom'); }
      return json(JSON.stringify(PEOPLE_OK));
    }
    if (req.url.startsWith(CNPJ)) {
      cnpjCalls.push(new URL(req.url, 'http://x').searchParams.get('cnpj'));
      if (cnpjMode === 'notfound') return json('{"ok":false,"error":"CNPJ nao encontrado.","company":null}');
      if (cnpjMode === 'down') return json('{"ok":false,"error":"getaddrinfo ENOTFOUND brasilapi.com.br","company":null}');
      return json(JSON.stringify(COMPANY_OK));
    }
    if (req.method === 'POST' && req.url === SUBMIT) { submitted = JSON.parse(body); return json('{"ok":true}'); }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
  });
});
await new Promise((resolve) => server.listen(8769, resolve));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } });
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(String(e)));

let failures = 0;
const assert = (condition, message) => {
  if (!condition) failures++;
  console.log((condition ? 'PASS  ' : 'FAIL  ') + message);
};
const waitForText = (id, text) => page
  .waitForFunction(([i, t]) => document.getElementById(i).textContent.includes(t), [id, text], { timeout: 5000 })
  .catch(() => {});

await page.goto('http://localhost:8769' + INTERFACE);

/* --- pagina unica, sem o campo de nome do departamento --- */
assert(await page.locator('.stepper, #btnNext, #btnBack, #deptName').count() === 0, 'sem wizard e sem "Department / area name"');
assert(await page.locator('#assessmentForm .panel').count() === 5, 'as 5 secoes aparecem juntas');

/* --- busca de pessoas --- */
await page.fill('#reqName', 'tahata');
await page.waitForSelector('#reqSuggestions .ac-item');
assert(peopleCalls[0].method === 'GET' && peopleCalls[0].q === 'tahata', 'busca por GET ?q=');
await page.locator('#reqSuggestions .ac-item').first().click();
assert(await page.inputValue('#reqEmail') === 'Eduardo.Tahata2@br.bosch.com', 'e-mail preenchido pelo diretorio');
assert(await page.inputValue('#reqDepartment') === 'MA/PUQ1-LA', 'departamento preenchido pelo diretorio');

peopleMode = 'graph';
await page.fill('#reqName', 'abc');
await waitForText('reqHint', 'Invalid filter');
assert((await page.textContent('#reqHint')).includes('Invalid filter'), 'erro do Graph aparece no campo');

peopleMode = 'empty';
await page.fill('#reqName', 'zzz');
await waitForText('reqSuggestions', 'No user found');
assert((await page.textContent('#reqSuggestions')).includes('No user found'), 'resultado vazio != erro');

peopleMode = 'legacy';
await page.fill('#reqName', 'jkl');
await page.waitForSelector('#reqSuggestions .ac-item', { timeout: 5000 }).catch(() => {});
assert(await page.locator('#reqSuggestions .ac-item').count() === 1, 'resposta em array puro ainda funciona');

peopleMode = 'ok';
await page.fill('#reqName', 'tahata');
await page.waitForSelector('#reqSuggestions .ac-item');
await page.locator('#reqSuggestions .ac-item').first().click();

/* --- consulta de CNPJ --- */
await page.fill('#cnpj', '11222333000181');
assert(await page.inputValue('#cnpj') === '11.222.333/0001-81', 'mascara do CNPJ');
await page.waitForFunction(() => document.getElementById('companyName').value.length > 0, null, { timeout: 5000 }).catch(() => {});
assert(cnpjCalls.at(-1) === '11222333000181', 'webhook de CNPJ chamado com os digitos');
assert(await page.inputValue('#companyName') === 'ROBERT BOSCH LTDA', 'razao social preenchida');
assert(await page.inputValue('#companyCity') === 'CAMPINAS / SP', 'municipio/UF preenchidos');
assert((await page.textContent('#cnpjHint')).includes('ATIVA'), 'situacao cadastral exibida');

const callsBefore = cnpjCalls.length;
await page.fill('#cnpj', '11222333000182');
await page.waitForTimeout(500);
assert(cnpjCalls.length === callsBefore, 'digito verificador errado nao chama a API');
assert((await page.textContent('#cnpjHint')).includes('Invalid CNPJ'), 'DV errado avisado no campo');
assert(await page.inputValue('#companyName') === '', 'dados da empresa limpos ao reeditar o CNPJ');

await page.fill('#cnpj', '12ABC34501DE35');
await page.waitForFunction(() => document.getElementById('companyName').value.length > 0, null, { timeout: 5000 }).catch(() => {});
assert(cnpjCalls.at(-1) === '12ABC34501DE35', 'CNPJ alfanumerico aceito');

cnpjMode = 'notfound';
await page.fill('#cnpj', '');
await page.fill('#cnpj', '11444777000161');
await waitForText('cnpjHint', 'nao encontrado');
assert((await page.textContent('#cnpjHint')).includes('nao encontrado'), 'CNPJ inexistente avisado');

cnpjMode = 'down';
await page.fill('#cnpj', '');
await page.fill('#cnpj', '11222333000181');
await waitForText('cnpjHint', 'ENOTFOUND');
assert((await page.textContent('#cnpjHint')).includes('ENOTFOUND'), 'falha da API externa aparece no campo');

/* --- validacao e envio --- */
await page.fill('#targetDate', '2026-12-01');
await page.fill('#cnpj', '11222333000182');
await page.click('#submitBtn');
await page.waitForTimeout(200);
assert((await page.textContent('#formError')).includes('CNPJ is invalid'), 'envio bloqueado com CNPJ invalido');

cnpjMode = 'ok';
await page.fill('#cnpj', '');
await page.fill('#cnpj', '11222333000181');
await page.waitForFunction(() => document.getElementById('companyName').value.length > 0, null, { timeout: 5000 }).catch(() => {});
await page.fill('[data-r-field="name"]', 'Marina Tahata');
await page.fill('[data-r-field="email"]', 'marina.tahata@br.bosch.com');
await page.fill('[data-a-field="name"]', 'Order to cash');
await page.click('#submitBtn');
await page.waitForFunction(() => document.getElementById('statusMsg').classList.contains('ok'), null, { timeout: 5000 }).catch(() => {});

assert(!!submitted, 'payload enviado');
assert(submitted.department.requestedByDepartment === 'MA/PUQ1-LA', 'departamento do diretorio no payload');
assert(submitted.company && submitted.company.razaoSocial === 'ROBERT BOSCH LTDA', 'empresa no payload');
assert(submitted.company.cnpj === '11222333000181' && submitted.company.cnpjFormatted === '11.222.333/0001-81', 'CNPJ no payload, cru e formatado');
assert(submitted.respondents.length === 1 && submitted.activities.length === 1, 'respondentes e atividades no payload');
assert(submitted.maturityFramework.dimensions.length === 10, 'framework intacto');
assert(jsErrors.length === 0, 'sem erros de JS' + (jsErrors.length ? ': ' + jsErrors.join(' | ') : ''));

await browser.close();
server.close();
console.log(failures ? `\n${failures} falha(s)` : '\nTudo passou');
process.exit(failures ? 1 : 0);
