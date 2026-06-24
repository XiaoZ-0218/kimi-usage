/**
 * 局域网看板 HTTP 服务端
 *
 * 使用 Node.js 内置 http 模块实现，零第三方依赖，
 * 允许局域网内手机/浏览器跨域访问实时用量数据。
 */

import http from 'http';
import { networkInterfaces } from 'os';
import type { UsageSnapshot } from './kimiApi';
import { getDashboardHtml } from './dashboard';

export class DashboardServer {
  private server?: http.Server;
  private readonly getSnapshot: () => UsageSnapshot | undefined;
  private readonly refreshSnapshot: () => Promise<void>;
  private readonly port: number;

  constructor(
    getSnapshot: () => UsageSnapshot | undefined,
    refreshSnapshot: () => Promise<void>,
    port: number
  ) {
    this.getSnapshot = getSnapshot;
    this.refreshSnapshot = refreshSnapshot;
    this.port = port;
  }

  /**
   * 启动 HTTP 服务器。
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.once('error', (err) => {
        this.server = undefined;
        reject(err);
      });
      this.server.listen(this.port, () => {
        // 保留一个通用错误处理器，避免服务器运行期间未处理异常
        this.server?.on('error', (err) => {
          console.error('Dashboard server error:', err);
        });
        resolve();
      });
    });
  }

  /**
   * 关闭 HTTP 服务器。
   */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      const s = this.server;
      this.server = undefined;
      s.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 返回当前监听的端口。
   */
  getPort(): number {
    return this.port;
  }

  /**
   * 判断服务器是否正在监听连接。
   */
  isRunning(): boolean {
    return !!this.server && this.server.listening;
  }

  /**
   * 获取局域网访问地址（形如 http://192.168.x.x:port/）。
   * 若未找到非内部 IPv4 网卡则返回 undefined。
   */
  getLanUrl(): string | undefined {
    const ip = getFirstNonInternalIPv4();
    if (!ip) {
      return undefined;
    }
    return `http://${ip}:${this.port}/`;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // 设置 CORS 响应头，允许局域网内任意来源跨域访问
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url || '/';

    if (req.method === 'GET' && url === '/') {
      const html = getDashboardHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if ((req.method === 'POST' || req.method === 'GET') && url === '/api/refresh') {
      try {
        await this.refreshSnapshot();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (req.method === 'GET' && url === '/api/usage') {
      const snapshot = this.getSnapshot();
      if (!snapshot) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '暂无数据' }));
        return;
      }
      // 将时间戳更新为当前请求时刻，这样看板每次刷新都能感受到时间变化
      const response = { ...snapshot, timestamp: Date.now() };
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(response));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

function getFirstNonInternalIPv4(): string | undefined {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const group = interfaces[name];
    if (!group) {
      continue;
    }
    for (const info of group) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address;
      }
    }
  }
  return undefined;
}
