"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseService = exports.SSEService = void 0;
class SSEService {
    clients = new Set();
    /**
     * Registers a client for Server-Sent Events streaming
     */
    addClient(res) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders?.();
        // Initial connection ping
        res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
        this.clients.add(res);
        console.log(`[SSE] Client connected. Total active streams: ${this.clients.size}`);
        // Heartbeat every 25 seconds to keep connection alive
        const heartbeat = setInterval(() => {
            res.write(": heartbeat\n\n");
        }, 25000);
        res.on("close", () => {
            clearInterval(heartbeat);
            this.clients.delete(res);
            console.log(`[SSE] Client disconnected. Active streams: ${this.clients.size}`);
        });
    }
    /**
     * Broadcasts an event to all connected clients
     */
    broadcast(event, data) {
        if (this.clients.size === 0)
            return;
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const client of this.clients) {
            try {
                client.write(payload);
            }
            catch (err) {
                this.clients.delete(client);
            }
        }
    }
    getActiveClientsCount() {
        return this.clients.size;
    }
}
exports.SSEService = SSEService;
exports.sseService = new SSEService();
