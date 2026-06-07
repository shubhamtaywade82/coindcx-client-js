const axios = require('axios');
const crypto = require('crypto');
const io = require('socket.io-client');
const EventEmitter = require('events');

/**
 * CoinDCX Futures Client Library (REST + Socket.IO)
 * Version: 2.1.0
 */
class CoinDCXFuturesClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || '';
        this.apiSecret = options.apiSecret || '';
        this.debug = options.debug || false;
        
        // Base URLs
        this.apiBase = options.apiBase || 'https://api.coindcx.com';
        this.publicApiBase = options.publicApiBase || 'https://public.coindcx.com';
        this.wsBase = options.wsBase || 'wss://stream.coindcx.com';
        
        // WebSocket state
        this.socket = null;
        this.connected = false;
        this.subscribedChannels = new Set();
        this.pendingSubscriptions = new Set();
        this.reconnectTimer = null;
        this.pingInterval = null;
        this.isReconnecting = false;
        this.autoReconnect = options.autoReconnect !== false;
        this.reconnectDelay = options.reconnectDelay || 5000;

        // WebSocket Event Names
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

    // --- Static Helpers ---

    static nowSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    static msToSeconds(ms) {
        return Math.floor(ms / 1000);
    }

    static buildPair(base, target, ecode = 'B') {
        return `${ecode}-${base}_${target}`;
    }

    static parsePair(pair) {
        const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
        if (match) {
            return { ecode: match[1], base: match[2], target: match[3] };
        }
        return null;
    }

    // --- Private Helpers ---

    _log(...args) {
        if (this.debug) {
            console.log('[CoinDCX-Client]', ...args);
        }
    }

    _error(...args) {
        console.error('[CoinDCX-Client]', ...args);
    }

    _generateSignature(payload) {
        if (!this.apiSecret) {
            throw new Error('API secret required for authenticated requests');
        }
        const signatureString = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(signatureString)
            .digest('hex');
    }

    async _request(method, path, data = {}, isPublic = false) {
        // Use public.coindcx.com for market_data endpoints, api.coindcx.com for others
        let baseUrl = path.startsWith('/market_data/') ? this.publicApiBase : this.apiBase;
        const url = `${baseUrl}${path}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        if (!isPublic) {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('API Key and Secret are required for authenticated requests');
            }
            if (!data.timestamp) {
                data.timestamp = CoinDCXFuturesClient.nowSeconds();
            }
            headers['X-AUTH-APIKEY'] = this.apiKey;
            headers['X-AUTH-SIGNATURE'] = this._generateSignature(data);
        }

        try {
            this._log(`${method} ${url}`, data);
            const response = await axios({
                method,
                url,
                data: method === 'POST' ? data : null,
                params: method === 'GET' ? data : null,
                headers,
            });
            return response.data;
        } catch (error) {
            this._log(`Request Error:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    // --- Public Futures Market Data ---

    async getActiveInstruments(marginCurrency = 'USDT') {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/active_instruments', { margin_currency: marginCurrency }, true);
    }

    async getInstrumentDetails(pair, marginCurrency = 'USDT') {
        // Fallback to market_details as documented /data/instruments often 404s
        const allDetails = await this.getMarketsDetails();
        return allDetails.find(m => m.pair === pair);
    }

    async getFuturesCandles(pair, from, to, resolution = '1m', limit = 500) {
        const params = { pair, interval: resolution };
        if (from) params.startTime = from * 1000;
        if (to) params.endTime = to * 1000;
        if (limit) params.limit = limit;

        const response = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(response) ? response.reverse() : response;
    }

    async getFuturesTradeHistory(pair, limit = 50) {
        return this._request('GET', '/market_data/trade_history', { pair, limit }, true);
    }

    async getFuturesOrderBook(pair) {
        return this._request('GET', '/market_data/orderbook', { pair }, true);
    }

    async getFuturesCurrentPrices() {
        return this.getTicker(); // Generic ticker provides all market prices
    }

    async getFundingRateHistory(pair, limit = 50) {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/funding_rate', { pair, limit }, true);
    }

    // --- Public Spot Market Data ---

    async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 500) {
        const params = { pair, interval };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        if (limit) params.limit = limit;
        const response = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(response) ? response.reverse() : response;
    }

    async getSpotTradeHistory(pair, limit = 50) {
        return this._request('GET', '/market_data/trade_history', { pair, limit }, true);
    }

    async getSpotOrderBook(pair) {
        return this._request('GET', '/market_data/orderbook', { pair }, true);
    }

    // --- Authenticated Futures Trading ---

    async createFuturesOrder(params) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/create', params);
    }

    async listFuturesOrders(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders', filters);
    }

    async getFuturesOrder(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/details', { id });
    }

    async cancelFuturesOrder(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel', { id });
    }

    async cancelAllFuturesOrders(pair, side) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel_all', { pair, side });
    }

    async editFuturesOrder(params) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/edit', params);
    }

    async getFuturesPositions(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions', filters);
    }

    async closeFuturesPosition(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/close', { id });
    }

    async updateLeverage(pair, leverage) {
        return this._request('POST', '/exchange/v1/derivatives/futures/leverage', { pair, leverage });
    }

    async getFuturesTransactions(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/transactions', filters);
    }

    async addFuturesMargin(id, amount) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/add_margin', { id, amount });
    }

    async removeFuturesMargin(id, amount) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/remove_margin', { id, amount });
    }

    // --- Wallet & Sub-Account ---

    async getTicker() {
        return this._request('GET', '/exchange/ticker', {}, true);
    }

    async getMarkets() {
        return this._request('GET', '/exchange/v1/markets', {}, true);
    }

    async getMarketsDetails() {
        return this._request('GET', '/exchange/v1/markets_details', {}, true);
    }

    async getBalances() {
        return this._request('POST', '/exchange/v1/users/balances', {});
    }

    async getUserInfo() {
        return this._request('POST', '/exchange/v1/users/info', {});
    }

    async walletTransfer(sourceWalletType, destinationWalletType, currencyShortName, amount) {
        return this._request('POST', '/exchange/v1/wallets/transfer', {
            source_wallet_type: sourceWalletType,
            destination_wallet_type: destinationWalletType,
            currency_short_name: currencyShortName,
            amount
        });
    }

    async subAccountTransfer(params) {
        return this._request('POST', '/exchange/v1/wallets/sub_account_transfer', params);
    }

    // --- WebSocket (Socket.IO v2.4.0) ---

    async wsConnect() {
        if (this.socket && this.connected) return;

        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.wsBase, {
                    transports: ['websocket'],
                    reconnection: false,
                    timeout: 30000,
                });

                this.socket.on('connect', () => {
                    this.connected = true;
                    this.isReconnecting = false;
                    this._log('WS Connected:', this.socket.id);
                    this._resubscribeAll();
                    this._startPing();
                    this.emit('ws:connect', { socketId: this.socket.id });
                    resolve();
                });

                this.socket.on('disconnect', (reason) => {
                    this.connected = false;
                    this._stopPing();
                    this._log('WS Disconnected:', reason);
                    this.emit('ws:disconnect', { reason });
                    if (this.autoReconnect && !this.isReconnecting) this._scheduleReconnect();
                });

                this.socket.on('connect_error', (err) => {
                    this._error('WS Connection error:', err.message);
                    this.emit('ws:error', { type: 'connect_error', error: err });
                    if (!this.connected) reject(err);
                });

                this._setupWsListeners();
            } catch (err) {
                reject(err);
            }
        });
    }

    _setupWsListeners() {
        // Market Data
        this.socket.on(this.wsEvents.candles, (res) => this.emit('ws:candlestick', this._normalizeCandle(res)));
        this.socket.on(this.wsEvents.orderBookSnapshot, (res) => this.emit('ws:depth-snapshot', this._normalizeDepth(res)));
        this.socket.on(this.wsEvents.orderBookUpdate, (res) => this.emit('ws:depth-update', this._normalizeDepth(res)));
        this.socket.on(this.wsEvents.trades, (res) => this.emit('ws:new-trade', this._normalizeTrade(res)));
        this.socket.on(this.wsEvents.prices, (res) => this.emit('ws:price-change', this._normalizePriceChange(res)));
        this.socket.on(this.wsEvents.currentPrices, (res) => this.emit('ws:currentPrices@futures#update', this._normalizeBatchPrices(res)));

        // Account Data
        this.socket.on(this.wsEvents.accountOrder, (res) => this.emit('ws:df-order-update', this._parseWsData(res)));
        this.socket.on(this.wsEvents.accountPosition, (res) => this.emit('ws:df-position-update', this._parseWsData(res)));
        this.socket.on(this.wsEvents.accountBalance, (res) => this.emit('ws:balance-update', this._parseWsData(res)));
    }

    _parseWsData(res) {
        if (!res) return null;
        if (typeof res.data === 'string') {
            try { return JSON.parse(res.data); } catch (e) { return res.data; }
        }
        return res.data || res;
    }

    _normalizeCandle(res) {
        const p = this._parseWsData(res);
        const c = Array.isArray(p.data) ? p.data[0] : p;
        return {
            channel: p.channel || res.i,
            product: p.pr || 'futures',
            eventTime: p.Ets,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume),
            openTime: c.open_time * 1000,
            closeTime: c.close_time * 1000,
            pair: c.pair,
            symbol: c.symbol,
            raw: res
        };
    }

    _normalizeDepth(res) {
        const p = this._parseWsData(res);
        const mapLevels = (lvls) => lvls ? Object.entries(lvls).map(([pr, q]) => ({ price: parseFloat(pr), quantity: parseFloat(q) })) : [];
        return {
            timestamp: p.ts,
            bids: mapLevels(p.bids),
            asks: mapLevels(p.asks),
            raw: res
        };
    }

    _normalizeTrade(res) {
        const p = this._parseWsData(res);
        return {
            timestamp: p.T,
            price: parseFloat(p.p),
            quantity: parseFloat(p.q),
            isMaker: p.m === 1,
            symbol: p.s,
            raw: res
        };
    }

    _normalizePriceChange(res) {
        const p = this._parseWsData(res);
        return { timestamp: p.T, price: parseFloat(p.p), symbol: p.s, raw: res };
    }

    _normalizeBatchPrices(res) {
        const p = this._parseWsData(res);
        const prices = {};
        if (p.prices) {
            for (const [pair, d] of Object.entries(p.prices)) {
                prices[pair] = { markPrice: parseFloat(d.mp), bmST: d.bmST, cmRT: d.cmRT };
            }
        }
        return { timestamp: p.ts, prices, raw: res };
    }

    wsSubscribe(channel) {
        if (!this.connected) return this.pendingSubscriptions.add(channel);
        this.socket.emit('join', { channelName: channel });
        this.subscribedChannels.add(channel);
    }

    wsSubscribeCandles(pair, interval = '1m') { this.wsSubscribe(`${pair}_${interval}-futures`); }
    wsSubscribeOrderBook(pair, depth = 50) { this.wsSubscribe(`${pair}@orderbook@${depth}-futures`); }
    wsSubscribeTrades(pair) { this.wsSubscribe(`${pair}@trades-futures`); }
    wsSubscribePrices(pair) { this.wsSubscribe(`${pair}@prices-futures`); }
    wsSubscribeCurrentPricesFutures() { this.wsSubscribe('currentPrices@futures@rt'); }

    wsSubscribeAccountFutures() {
        if (!this.apiKey || !this.apiSecret) throw new Error('API Key/Secret required for account streams');
        const channel = 'coindcx';
        const signature = this._generateSignature({ channelName: channel });
        this.socket.emit('events', { channelName: channel, authKey: this.apiKey, authSignature: signature });
        this.subscribedChannels.add(channel);
    }

    _resubscribeAll() {
        const all = [...this.subscribedChannels, ...this.pendingSubscriptions];
        this.subscribedChannels.clear();
        this.pendingSubscriptions.clear();
        all.forEach(c => c === 'coindcx' ? this.wsSubscribeAccountFutures() : this.wsSubscribe(c));
    }

    _startPing() {
        this._stopPing();
        this.pingInterval = setInterval(() => { if (this.connected) this.socket.emit('ping'); }, 25000);
    }

    _stopPing() { if (this.pingInterval) clearInterval(this.pingInterval); this.pingInterval = null; }

    _scheduleReconnect() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;
        this.reconnectTimer = setTimeout(async () => {
            try { await this.wsConnect(); } catch (e) { this.isReconnecting = false; this._scheduleReconnect(); }
        }, this.reconnectDelay);
    }

    wsDisconnect() {
        this.autoReconnect = false;
        this._stopPing();
        if (this.socket) this.socket.disconnect();
        this.connected = false;
        this._log('WS Disconnected manually');
    }
}

module.exports = { CoinDCXFuturesClient };
