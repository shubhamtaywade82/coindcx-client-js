const axios = require('axios');
const crypto = require('crypto');
const io = require('socket.io-client');
const EventEmitter = require('events');

/**
 * --- CUSTOM ERRORS ---
 */

class CoinDCXError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class CoinDCXAPIError extends CoinDCXError {
    constructor(message, status, data, method, url) {
        super(message);
        this.status = status;
        this.data = data;
        this.method = method;
        this.url = url;
        this.isRetryable = [429, 500, 502, 503, 504].includes(status);
    }
}

class CoinDCXNetworkError extends CoinDCXError {
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.isRetryable = true;
    }
}

/**
 * CoinDCX Futures Client Library (REST + Socket.IO)
 * Version: 2.3.0 (Official Documentation Parity)
 */
class CoinDCXFuturesClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || '';
        this.apiSecret = options.apiSecret || '';
        this.debug = options.debug || false;
        
        this.apiBase = options.apiBase || 'https://api.coindcx.com';
        this.publicApiBase = options.publicApiBase || 'https://public.coindcx.com';
        this.wsBase = options.wsBase || 'wss://stream.coindcx.com';
        
        // WebSocket State
        this.socket = null;
        this.connected = false;
        this.subscribedChannels = new Set();
        this.pendingSubscriptions = new Set();
        this.reconnectAttempts = 0;
        this.maxRetries = options.maxRetries || 10;
        this.autoReconnect = options.autoReconnect !== false;
        
        // Rate Limiting (Token Bucket)
        this.requestTokens = options.maxRequestsPerWindow || 1500;
        this.maxTokens = this.requestTokens;
        this.lastRefill = Date.now();
        this.refillRate = this.maxTokens / (options.rateLimitWindow || 60000);

        this.wsEvents = {
            candles: 'candlestick',
            orderBookSnapshot: 'depth-snapshot',
            orderBookUpdate: 'depth-update',
            trades: 'new-trade',
            prices: 'price-change',
            currentPrices: 'currentPrices@futures#update',
            accountOrder: 'df-order-update',
            accountPosition: 'df-position-update',
            accountBalance: 'balance-update',
        };
    }

    // --- Static Utilities ---

    static nowSeconds() { return Math.floor(Date.now() / 1000); }
    static buildPair(base, target, ecode = 'B') { return `${ecode}-${base}_${target}`; }
    static parsePair(pair) {
        const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
        if (match) return { ecode: match[1], base: match[2], target: match[3] };
        return null;
    }
    static calculateLiquidationPrice(entryPrice, leverage, side, mm = 0.005) {
        const dir = side.toLowerCase() === 'buy' || side.toLowerCase() === 'long' ? 1 : -1;
        return dir === 1 ? entryPrice * (1 - (1 / leverage) + mm) : entryPrice * (1 + (1 / leverage) - mm);
    }

    // --- Private Engine ---

    _log(...args) { if (this.debug) console.log(`[CoinDCX-v2.3] ${new Date().toISOString()}`, ...args); }

    _generateSignature(payload) {
        if (!this.apiSecret) throw new CoinDCXError('API Secret missing');
        return crypto.createHmac('sha256', this.apiSecret).update(JSON.stringify(payload)).digest('hex');
    }

    _generateClientId() { return `js_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`; }

    async _throttle() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        this.requestTokens = Math.min(this.maxTokens, this.requestTokens + elapsed * this.refillRate);
        this.lastRefill = now;

        if (this.requestTokens < 1) {
            const wait = (1 / this.refillRate);
            this._log(`Rate limit throttled. Waiting ${wait.toFixed(0)}ms`);
            await new Promise(r => setTimeout(r, wait));
            return this._throttle();
        }
        this.requestTokens -= 1;
    }

    async _request(method, path, data = {}, isPublic = false) {
        await this._throttle();
        let baseUrl = path.startsWith('/market_data/') ? this.publicApiBase : this.apiBase;
        const url = `${baseUrl}${path}`;
        const headers = { 'Content-Type': 'application/json', 'User-Agent': 'CoinDCX-Node-SDK/2.3.0' };

        if (!isPublic) {
            if (!this.apiKey || !this.apiSecret) throw new CoinDCXError('API Key/Secret required');
            if (!data.timestamp) data.timestamp = CoinDCXFuturesClient.nowSeconds();
            headers['X-AUTH-APIKEY'] = this.apiKey;
            headers['X-AUTH-SIGNATURE'] = this._generateSignature(data);
        }

        try {
            this._log(`${method} ${url}`, this.debug ? data : '');
            const response = await axios({ method, url, data: method === 'POST' ? data : null, params: method === 'GET' ? data : null, headers, timeout: 15000 });
            return response.data;
        } catch (error) {
            if (error.response) throw new CoinDCXAPIError(error.response.data.message || error.response.statusText, error.response.status, error.response.data, method, url);
            throw new CoinDCXNetworkError(error.message, error);
        }
    }

    // --- Public Futures Market Data ---

    async getActiveInstruments(marginCurrency = 'USDT') { return this._request('GET', '/exchange/v1/derivatives/futures/data/active_instruments', { margin_currency: marginCurrency }, true); }
    async getMarketsDetails() { return this._request('GET', '/exchange/v1/markets_details', {}, true); }
    async getInstrumentDetails(pair) {
        const all = await this.getMarketsDetails();
        const found = all.find(m => m.pair === pair || m.coindcx_name === pair || m.symbol === pair);
        if (found) return found;
        const activeFutures = await this.getActiveInstruments();
        if (activeFutures.includes(pair)) return { pair, symbol: pair.split('-')[1].replace('_', ''), ecode: pair.split('-')[0], status: 'active', type: 'futures' };
        throw new CoinDCXError(`Instrument ${pair} not found`);
    }
    async getFuturesCandles(pair, from, to, resolution = '1m', limit = 500) {
        const params = { pair, interval: resolution, limit };
        if (from) params.startTime = from * 1000;
        if (to) params.endTime = to * 1000;
        const res = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(res) ? res.reverse() : res;
    }
    async getFuturesTradeHistory(pair, limit = 50) { return this._request('GET', '/market_data/trade_history', { pair, limit }, true); }
    async getFuturesOrderBook(pair) { return this._request('GET', '/market_data/orderbook', { pair }, true); }
    async getTicker() { return this._request('GET', '/exchange/ticker', {}, true); }
    async getFundingRateHistory(pair, limit = 50) { return this._request('GET', '/exchange/v1/derivatives/futures/data/funding_rate', { pair, limit }, true); }
    async getFuturesStats() { return this._request('GET', '/api/v1/derivatives/futures/data/stats', {}, true); }

    // --- Public Spot Market Data ---

    async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 500) {
        const params = { pair, interval, limit };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        const res = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(res) ? res.reverse() : res;
    }
    async getSpotTradeHistory(pair, limit = 50) { return this._request('GET', '/market_data/trade_history', { pair, limit }, true); }
    async getSpotOrderBook(pair) { return this._request('GET', '/market_data/orderbook', { pair }, true); }
    async getActiveOrdersCount() { return this._request('POST', '/exchange/v1/orders/active_orders_count', {}); }

    // --- Authenticated Spot Trading ---

    async createOrder(params) { if (!params.client_order_id) params.client_order_id = this._generateClientId(); return this._request('POST', '/exchange/v1/orders/create', params); }
    async createMultipleOrders(orders) { orders.forEach(o => { if (!o.client_order_id) o.client_order_id = this._generateClientId(); }); return this._request('POST', '/exchange/v1/orders/create_multiple', { orders }); }
    async getOrderStatus(id) { return this._request('POST', '/exchange/v1/orders/status', { id }); }
    async getOrderStatusMultiple(ids) { return this._request('POST', '/exchange/v1/orders/status_multiple', { ids }); }
    async getActiveOrders() { return this._request('POST', '/exchange/v1/orders/active_orders', {}); }
    async cancelOrder(id) { return this._request('POST', '/exchange/v1/orders/cancel', { id }); }
    async cancelAllOrders(side, market) { return this._request('POST', '/exchange/v1/orders/cancel_all', { side, market }); }
    async cancelOrdersByIds(ids) { return this._request('POST', '/exchange/v1/orders/cancel_by_ids', { ids }); }
    async editOrder(id, price) { return this._request('POST', '/exchange/v1/orders/edit', { id, price }); }
    async getUserSpotTradeHistory(market, limit = 50) { return this._request('POST', '/exchange/v1/orders/trade_history', { market, limit }); }

    // --- Authenticated Legacy Margin Trading ---

    async createMarginOrder(params) { return this._request('POST', '/exchange/v1/margin/create', params); }
    async cancelMarginOrder(id) { return this._request('POST', '/exchange/v1/margin/cancel', { id }); }
    async exitMarginPosition(id) { return this._request('POST', '/exchange/v1/margin/exit', { id }); }
    async editMarginTarget(id, target_price) { return this._request('POST', '/exchange/v1/margin/edit_target', { id, target_price }); }
    async editMarginPriceOfTargetOrder(id, price) { return this._request('POST', '/exchange/v1/margin/edit_price_of_target_order', { id, price }); }
    async editMarginSL(id, sl_price) { return this._request('POST', '/exchange/v1/margin/edit_sl', { id, sl_price }); }
    async editMarginTrailingSL(id, trailing_sl) { return this._request('POST', '/exchange/v1/margin/edit_trailing_sl', { id, trailing_sl }); }
    async addMargin(id, amount) { return this._request('POST', '/exchange/v1/margin/add_margin', { id, amount }); }
    async removeMargin(id, amount) { return this._request('POST', '/exchange/v1/margin/remove_margin', { id, amount }); }
    async fetchMarginOrders(params = {}) { return this._request('POST', '/exchange/v1/margin/fetch_orders', params); }
    async getMarginOrder(id) { return this._request('POST', '/exchange/v1/margin/order', { id }); }

    // --- Authenticated Lending ---

    async fetchLendOrders() { return this._request('POST', '/exchange/v1/funding/fetch_orders', {}); }
    async lend(currency, amount, side) { return this._request('POST', '/exchange/v1/funding/lend', { currency, amount, side }); }
    async settleLendOrder(id) { return this._request('POST', '/exchange/v1/funding/settle', { id }); }

    // --- Authenticated Futures Trading ---

    async createFuturesOrder(params) { if (!params.client_order_id) params.client_order_id = this._generateClientId(); return this._request('POST', '/exchange/v1/derivatives/futures/orders/create', params); }
    async listFuturesOrders(filters = {}) { return this._request('POST', '/exchange/v1/derivatives/futures/orders', filters); }
    async getFuturesOrder(id) { return this._request('POST', '/exchange/v1/derivatives/futures/orders/details', { id }); }
    async cancelFuturesOrder(id) { return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel', { id }); }
    async cancelAllFuturesOrders(pair, side) { return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel_all', { pair, side }); }
    async editFuturesOrder(params) { return this._request('POST', '/exchange/v1/derivatives/futures/orders/edit', params); }
    async getFuturesPositions(filters = {}) { return this._request('POST', '/exchange/v1/derivatives/futures/positions', filters); }
    async closeFuturesPosition(id) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/close', { id }); }
    async exitFuturesPosition(pair) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/exit', { pair }); }
    async createFuturesTPSL(params) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/create_tpsl', params); }
    async getFuturesCrossMarginDetails() { return this._request('POST', '/exchange/v1/derivatives/futures/positions/cross_margin_details', {}); }
    async updateFuturesMarginType(pair, margin_type) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/margin_type', { pair, margin_type }); }
    async updateLeverage(pair, leverage) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/update_leverage', { pair, leverage }); }
    async getFuturesTrades(filters = {}) { return this._request('POST', '/exchange/v1/derivatives/futures/trades', filters); }
    async addFuturesMargin(id, amount) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/add_margin', { id, amount }); }
    async removeFuturesMargin(id, amount) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/remove_margin', { id, amount }); }
    async cancelAllOrdersForPosition(position_id) { return this._request('POST', '/exchange/v1/derivatives/futures/positions/cancel_all_open_orders_for_position', { position_id }); }
    async getFuturesTransactions(filters = {}) { return this._request('POST', '/exchange/v1/derivatives/futures/transactions', filters); }

    // --- Wallet & Sub-Account ---

    async getMarkets() { return this._request('GET', '/exchange/v1/markets', {}, true); }
    async getBalances() { return this._request('POST', '/exchange/v1/users/balances', {}); }
    async getUserInfo() { return this._request('POST', '/exchange/v1/users/info', {}); }
    async getFuturesWallet() { return this._request('GET', '/exchange/v1/derivatives/futures/wallets', {}, true); }
    async getFuturesWalletTransactions() { return this._request('GET', '/exchange/v1/derivatives/futures/wallets/transactions', {}, true); }
    async futuresWalletTransfer(transfer_type, currency_short_name, amount) { return this._request('POST', '/exchange/v1/derivatives/futures/wallets/transfer', { transfer_type, currency_short_name, amount }); }
    async walletTransfer(sourceWalletType, destinationWalletType, currencyShortName, amount) {
        return this._request('POST', '/exchange/v1/wallets/transfer', { source_wallet_type: sourceWalletType, destination_wallet_type: destinationWalletType, currency_short_name: currencyShortName, amount });
    }
    async subAccountTransfer(params) { return this._request('POST', '/exchange/v1/wallets/sub_account_transfer', params); }

    // --- WebSocket ---

    async wsConnect() {
        if (this.socket && this.connected) return;
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.wsBase, { transports: ['websocket'], reconnection: false, timeout: 20000 });
                this.socket.on('connect', () => { this.connected = true; this.reconnectAttempts = 0; this._log('WS Connected:', this.socket.id); this._resubscribeAll(); this._startPing(); this.emit('ws:connect', { socketId: this.socket.id }); resolve(); });
                this.socket.on('disconnect', (reason) => { this.connected = false; this._stopPing(); this._log('WS Disconnected:', reason); this.emit('ws:disconnect', { reason }); if (this.autoReconnect && reason !== 'io client disconnect') this._scheduleReconnect(); });
                this.socket.on('connect_error', (err) => { this._error('WS Connection error:', err.message); this.emit('ws:error', { type: 'connect_error', error: err }); if (!this.connected) reject(err); });
                this._setupWsListeners();
            } catch (err) { reject(err); }
        });
    }

    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxRetries) { this._error('Max WS reconnection attempts reached.'); return; }
        this.reconnectAttempts++;
        const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000) + (Math.random() * 1000);
        this._log(`Reconnecting in ${(delay/1000).toFixed(1)}s (Attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.wsConnect().catch(() => {}), delay);
    }

    _setupWsListeners() {
        this.socket.on(this.wsEvents.candles, (res) => this.emit('ws:candlestick', this._normalizeCandle(res)));
        this.socket.on(this.wsEvents.orderBookSnapshot, (res) => this.emit('ws:depth-snapshot', this._normalizeDepth(res)));
        this.socket.on(this.wsEvents.orderBookUpdate, (res) => this.emit('ws:depth-update', this._normalizeDepth(res)));
        this.socket.on(this.wsEvents.trades, (res) => this.emit('ws:new-trade', this._normalizeTrade(res)));
        this.socket.on(this.wsEvents.prices, (res) => this.emit('ws:price-change', this._normalizePriceChange(res)));
        this.socket.on(this.wsEvents.currentPrices, (res) => this.emit('ws:currentPrices@futures#update', this._normalizeBatchPrices(res)));
        this.socket.on(this.wsEvents.accountOrder, (res) => this.emit('ws:df-order-update', this._parseWsData(res)));
        this.socket.on(this.wsEvents.accountPosition, (res) => this.emit('ws:df-position-update', this._parseWsData(res)));
        this.socket.on(this.wsEvents.accountBalance, (res) => this.emit('ws:balance-update', this._parseWsData(res)));
    }

    _parseWsData(res) { if (!res) return null; if (typeof res.data === 'string') { try { return JSON.parse(res.data); } catch (e) { return res.data; } } return res.data || res; }
    _normalizeCandle(res) {
        const p = this._parseWsData(res);
        const c = Array.isArray(p.data) ? p.data[0] : p;
        return {
            channel: p.channel || res.i || 'unknown',
            product: p.pr || (res.i && res.i.includes('futures') ? 'futures' : 'spot'),
            eventTime: p.Ets || Date.now(),
            open: parseFloat(c.open || c.o || 0),
            high: parseFloat(c.high || c.h || 0),
            low: parseFloat(c.low || c.l || 0),
            close: parseFloat(c.close || c.c || 0),
            volume: parseFloat(c.volume || c.v || 0),
            openTime: (c.open_time || c.t || Date.now()) * (c.open_time < 10000000000 ? 1000 : 1),
            closeTime: (c.close_time || (c.t ? c.t + 60 : Date.now())) * (c.close_time < 10000000000 ? 1000 : 1),
            pair: c.pair || c.s || p.pair || 'unknown',
            symbol: c.symbol || c.s || 'unknown',
            raw: res
        };
    }
    _normalizeDepth(res) { const p = this._parseWsData(res); const mapLevels = (lvls) => lvls ? Object.entries(lvls).map(([pr, q]) => ({ price: parseFloat(pr), quantity: parseFloat(q) })) : []; return { timestamp: p.ts, bids: mapLevels(p.bids), asks: mapLevels(p.asks), raw: res }; }
    _normalizeTrade(res) { const p = this._parseWsData(res); return { timestamp: p.T, price: parseFloat(p.p), quantity: parseFloat(p.q), isMaker: p.m === 1, symbol: p.s, raw: res }; }
    _normalizePriceChange(res) { const p = this._parseWsData(res); return { timestamp: p.T, price: parseFloat(p.p), symbol: p.s, raw: res }; }
    _normalizeBatchPrices(res) { const p = this._parseWsData(res); const prices = {}; if (p.prices) { for (const [pair, d] of Object.entries(p.prices)) { prices[pair] = { markPrice: parseFloat(d.mp), bmST: d.bmST, cmRT: d.cmRT }; } } return { timestamp: p.ts, prices, raw: res }; }

    wsSubscribe(channel) { if (!this.connected) return this.pendingSubscriptions.add(channel); this.socket.emit('join', { channelName: channel }); this.subscribedChannels.add(channel); }
    wsSubscribeCandles(pair, interval = '1m') { this.wsSubscribe(`${pair}_${interval}-futures`); }
    wsSubscribeOrderBook(pair, depth = 50) { this.wsSubscribe(`${pair}@orderbook@${depth}-futures`); }
    wsSubscribeTrades(pair) { this.wsSubscribe(`${pair}@trades-futures`); }
    wsSubscribePrices(pair) { this.wsSubscribe(`${pair}@prices-futures`); }
    wsSubscribeCurrentPricesFutures() { this.wsSubscribe('currentPrices@futures@rt'); }
    wsSubscribeSpotCandles(pair, interval = '1m') { this.wsSubscribe(`${pair}_${interval}`); }
    wsSubscribeSpotOrderBook(pair, depth = 50) { this.wsSubscribe(`${pair}@orderbook@${depth}`); }
    wsSubscribeSpotTrades(pair) { this.wsSubscribe(`${pair}@trades`); }
    wsSubscribeSpotPrices(pair) { this.wsSubscribe(`${pair}@prices`); }

    wsSubscribeAccountFutures() {
        if (!this.apiKey || !this.apiSecret) throw new CoinDCXError('API Key/Secret required');
        const channel = 'coindcx';
        const signature = this._generateSignature({ channelName: channel });
        this.socket.emit('events', { channelName: channel, authKey: this.apiKey, authSignature: signature });
        this.subscribedChannels.add(channel);
    }

    _resubscribeAll() { const all = [...this.subscribedChannels, ...this.pendingSubscriptions]; this.subscribedChannels.clear(); this.pendingSubscriptions.clear(); all.forEach(c => c === 'coindcx' ? this.wsSubscribeAccountFutures() : this.wsSubscribe(c)); }
    _startPing() { this._stopPing(); this.pingInterval = setInterval(() => { if (this.connected) this.socket.emit('ping'); }, 25000); }
    _stopPing() { if (this.pingInterval) clearInterval(this.pingInterval); this.pingInterval = null; }
    wsDisconnect() { this.autoReconnect = false; this._stopPing(); if (this.socket) this.socket.disconnect(); this.connected = false; this._log('WS Disconnected manually'); }
}

module.exports = { CoinDCXFuturesClient, CoinDCXError, CoinDCXAPIError, CoinDCXNetworkError };
