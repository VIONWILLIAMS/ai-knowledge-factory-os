import { createServer } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8081);
const maxBodyBytes = 180 * 1024 * 1024;
const encoderScript = join(root, 'encode-mp4.swift');
const zaiApiKey = process.env.ZAI_API_KEY || process.env.GLM_API_KEY || '';
const zaiApiBaseUrl = (process.env.ZAI_API_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/+$/, '');
const zaiModel = process.env.ZAI_MODEL || 'glm-5.2';
const zaiRequestTimeoutMs = Number(process.env.ZAI_TIMEOUT_MS || 45000);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
};

function checkSwiftEncoder(timeoutMs = 3000) {
  return new Promise(resolve => {
    const child = spawn('swift', ['--version'], { stdio: ['ignore', 'ignore', 'ignore'] });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(false);
    }, timeoutMs);
    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(data));
}

function sendText(response, status, text) {
  response.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(text);
}

async function readRequestBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maxBodyBytes) {
      throw new Error('Request body is too large.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function runSwiftEncoder(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('swift', [encoderScript, ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('MP4 encoder timed out.'));
    }, 120000);
    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

async function writeFrames(tempDir, frames) {
  await Promise.all(frames.map((frame, index) => {
    const filename = join(tempDir, `frame_${String(index + 1).padStart(4, '0')}.jpg`);
    return fs.writeFile(filename, Buffer.from(frame, 'base64'));
  }));
}

async function encodeMp4({ fps, width, height, frames }) {
  if (!Array.isArray(frames) || frames.length < 2) {
    throw new Error('At least two frames are required.');
  }
  if (!Number.isFinite(fps) || fps < 1 || fps > 60) {
    throw new Error('Invalid fps.');
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
    throw new Error('Invalid frame size.');
  }

  const tempDir = await fs.mkdtemp(join(tmpdir(), 'warehouse-mp4-'));
  const outputPath = join(tempDir, 'warehouse-dt-os.mp4');

  try {
    await writeFrames(tempDir, frames);
    await runSwiftEncoder([
      tempDir,
      String(fps),
      String(Math.round(width / 2) * 2),
      String(Math.round(height / 2) * 2),
      outputPath,
    ]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function handleEncodeMp4(request, response) {
  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body);
    const mp4 = await encodeMp4(payload);
    response.writeHead(200, {
      'content-type': 'video/mp4',
      'content-length': mp4.length,
      'content-disposition': 'attachment; filename="warehouse-dt-os.mp4"',
      'cache-control': 'no-store',
    });
    response.end(mp4);
  } catch (error) {
    sendText(response, 500, error instanceof Error ? error.message : String(error));
  }
}

function extractJsonObject(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]);
      } catch {
        // Continue with loose object extraction below.
      }
    }
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(text.slice(first, last + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function buildExecutiveSystemPrompt() {
  return [
    '你是 AI Knowledge Factory OS 的 GLM-5.2 中控塔协作引擎。',
    '场景：一个 3D 个人智能工厂，中控塔内有 CEO、CIO、COO、CTO、CFO 五个 AI 高管队友。',
    '你的任务不是泛泛聊天，而是把用户意图转成可经营、可协作、可回流到工厂流水线的决策。',
    '重点能力：经营辅助、高管群聊、临时协作舱、工厂任务生成、工厂矩阵机会判断。',
    '回复必须短、具体、可执行，避免空泛战略词。',
    '只输出 JSON，不要 Markdown。',
    'JSON schema: {"messages":[{"speaker":"CEO|CIO|COO|CTO|CFO|CEO 总结","agentId":"ceo|cio|coo|cto|cfo","text":"短结论"}],"summary":"可作为工厂任务内容的总结","decisionFlow":[{"role":"CEO|CIO|COO|CTO|CFO|BOARD","text":"决策流一句话"}],"handoffTitle":"状态标题","handoffDetail":"任务回流说明"}',
  ].join('\n');
}

function buildExecutiveUserPrompt(payload) {
  const mode = payload?.mode === 'board' ? 'board' : 'single';
  const activeAgent = String(payload?.agentId || 'ceo');
  const question = String(payload?.question || '').slice(0, 1200);
  const agents = Array.isArray(payload?.agents) ? payload.agents : [];
  const ops = payload?.ops || {};
  return JSON.stringify({
    mode,
    activeAgent,
    question,
    agents: agents.map(agent => ({
      id: agent.id,
      title: agent.title,
      mission: agent.mission,
      focus: agent.focus,
    })),
    factoryOps: {
      backlog: ops.backlog,
      activeJobs: ops.activeJobs,
      blockedTasks: ops.blockedTasks,
      outputsToday: ops.outputsToday,
    },
    requiredBehavior: mode === 'board'
      ? '让五个高管分别发言，并给出 CEO 总结。'
      : '只让 activeAgent 对应的高管发言。',
  });
}

async function callZaiChatCompletions(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), zaiRequestTimeoutMs);
  try {
    const result = await fetch(`${zaiApiBaseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${zaiApiKey}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'zh-CN,zh',
      },
      body: JSON.stringify({
        model: zaiModel,
        thinking: { type: 'disabled' },
        enable_thinking: false,
        temperature: 0.8,
        max_tokens: 1200,
        stream: false,
        messages: [
          { role: 'system', content: buildExecutiveSystemPrompt() },
          { role: 'user', content: buildExecutiveUserPrompt(payload) },
        ],
      }),
    });
    const text = await result.text();
    if (!result.ok) {
      throw new Error(`Z.AI returned ${result.status}: ${text.slice(0, 500)}`);
    }
    const data = JSON.parse(text);
    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(content);
    if (!parsed) throw new Error('GLM response did not contain valid JSON.');
    return {
      ...parsed,
      provider: {
        model: data?.model || zaiModel,
        requestId: data?.request_id || data?.id || '',
        usage: data?.usage || null,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function handleGlmExecutiveChat(request, response) {
  if (!zaiApiKey) {
    sendJson(response, 503, {
      ok: false,
      configured: false,
      error: 'ZAI_API_KEY or GLM_API_KEY is not configured on the local server.',
      model: zaiModel,
    });
    return;
  }

  try {
    const body = await readRequestBody(request);
    const payload = JSON.parse(body);
    const startedAt = Date.now();
    const result = await callZaiChatCompletions(payload);
    sendJson(response, 200, {
      ok: true,
      configured: true,
      latencyMs: Date.now() - startedAt,
      model: result.provider?.model || zaiModel,
      ...result,
    });
  } catch (error) {
    sendJson(response, 502, {
      ok: false,
      configured: true,
      model: zaiModel,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url || '/', `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }
    response.writeHead(200, {
      'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'content-length': stat.size,
      'cache-control': 'no-store',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/record-capability') {
    const nativeEncoder = await checkSwiftEncoder();
    sendJson(response, 200, { mp4: nativeEncoder, encoder: 'swift-avfoundation', mode: 'canvas-frames' });
    return;
  }

  if (request.method === 'GET' && request.url === '/api/glm-status') {
    sendJson(response, 200, {
      configured: Boolean(zaiApiKey),
      model: zaiModel,
      baseUrl: zaiApiBaseUrl,
    });
    return;
  }

  if (request.method === 'POST' && request.url === '/api/encode-mp4') {
    await handleEncodeMp4(request, response);
    return;
  }

  if (request.method === 'POST' && request.url === '/api/glm-executive-chat') {
    await handleGlmExecutiveChat(request, response);
    return;
  }

  if (request.method === 'GET' || request.method === 'HEAD') {
    await serveStatic(request, response);
    return;
  }

  sendText(response, 405, 'Method not allowed');
});

server.listen(port, '::', () => {
  console.log(`Smart Warehouse recorder server: http://localhost:${port}/`);
});
