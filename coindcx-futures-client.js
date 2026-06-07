const axios = require('axios');
const crypto = require('crypto');
const io = require('socket.io-client');
const EventEmitter = require('events');

class CoinDCXFuturesClient extends EventEmitter {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey;
        this.apiSecret = options.apiSecret;
        this.debug = options.debug || false;
        this.apiBase = options.apiBase || 'https://api.coindcx.com';
        this.publicApiBase = options.publicApiBase || 'https://public.coindcx.com';
        this.wsBase = options.wsBase || 'wss://stream.coindcx.com';
        this.socket = null;
        this.subscriptions = new Set();
    }

    // --- Helper Methods ---

    static nowSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    static msToSeconds(ms) {
        return Math.floor(ms / 1000);
    }

    static buildPair(base, target) {
        return `B-${base}_${target}`;
    }

    static parsePair(pair) {
        // Example: B-BTC_USDT -> { base: 'BTC', target: 'USDT', ecode: 'B' }
        const match = pair.match(/^([A-Z])-([A-Z0-9]+)_([A-Z0-9]+)$/);
        if (match) {
            return { ecode: match[1], base: match[2], target: match[3] };
        }
        return null;
    }

    _log(...args) {
        if (this.debug) {
            console.log('[CoinDCX-Client]', ...args);
        }
    }

    _generateSignature(payload) {
        const signatureString = JSON.stringify(payload);
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(signatureString)
            .digest('hex');
    }

    async _request(method, path, data = {}, isPublic = false) {
        const baseUrl = isPublic ? this.publicApiBase : this.apiBase;
        const url = `${baseUrl}${path}`;
        
        const headers = {
            'Content-Type': 'application/json',
        };

        if (!isPublic) {
            if (!this.apiKey || !this.apiSecret) {
                throw new Error('API Key and Secret are required for authenticated requests');
            }
            
            // Inject timestamp if not present for private requests
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
        return this._request('GET', '/exchange/v1/derivatives/futures/data/instruments', { pair, margin_currency: marginCurrency }, true);
    }

    async getFuturesCandles(pair, from, to, resolution = '1m') {
        const response = await this._request('GET', '/exchange/v1/derivatives/futures/data/candles', { pair, from, to, resolution }, true);
        if (Array.isArray(response)) {
            return response.reverse(); // CoinDCX returns descending, reverse to ascending
        }
        return response;
    }

    async getFuturesTradeHistory(pair, limit = 50) {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/trade_history', { pair, limit }, true);
    }

    async getFuturesOrderBook(instrument, depth = 20) {
        // Note: instrument usually BTCUSDT, but pair is B-BTC_USDT. 
        // Docs say /public/market_data/v3/orderbook/{instrument}-futures/{depth}
        return this._request('GET', `/public/market_data/v3/orderbook/${instrument}-futures/${depth}`, {}, true);
    }

    async getFuturesCurrentPrices() {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/current_prices', {}, true);
    }

    async getFundingRateHistory(pair, limit = 50) {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/funding_rate', { pair, limit }, true);
    }

    // --- Public Spot Market Data ---

    async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 50) {
        const response = await this._request('GET', '/market_data/candles', { pair, interval, startTime, endTime, limit }, true);
        if (Array.isArray(response)) {
            return response.reverse(); // CoinDCX returns descending, reverse to ascending
        }
        return response;
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

    // --- Legacy / Wallet ---

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
        return new Promise((resolve, reject) => {
            this._log(`Connecting to WS: ${this.wsBase}`);
            this.socket = io(this.wsBase, {
                transports: ['websocket'],
                upgrade: false,
                reconnection: true,
                reconnectionDelay: 5000,
            });

            this.socket.on('connect', () => {
                this._log('Connected to WebSocket');
                this._setupHeartbeat();
                this._resubscribe();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                this._log('WS Connect Error:', error);
                reject(error);
            });

            this.socket.on('disconnect', (reason) => {
                this._log('Disconnected from WebSocket:', reason);
                this.emit('ws:disconnected', reason);
            });

            this.socket.on('error', (error) => {
                this._log('WS Error:', error);
                this.emit('ws:error', error);
            });

            // Generic event handler to normalize and emit
            this.socket.onAny((event, data) => {
                this._handleWsEvent(event, data);
            });
        });
    }

    _setupHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping');
            }
        }, 25000);
    }

    _resubscribe() {
        for (const channel of this.subscriptions) {
            this._log(`Resubscribing to: ${channel}`);
            this.socket.emit('join', { channelName: channel });
        }
    }

    _handleWsEvent(event, data) {
        this._log(`WS Event: ${event}`, data);
        
        // Normalization logic based on event types
        if (event.includes('candlestick')) {
            this.emit('ws:candlestick', this._normalizeCandle(data));
        } else if (event.includes('@orderbook')) {
            if (data.type === 'snapshot') {
                this.emit('ws:depth-snapshot', this._normalizeDepth(data));
            } else {
                this.emit('ws:depth-update', this._normalizeDepth(data));
            }
        } else if (event.includes('@trades')) {
            this.emit('ws:new-trade', this._normalizeTrade(data));
        } else if (event.includes('@prices')) {
            this.emit('ws:price-change', data);
        } else if (event === 'currentPrices@futures#update') {
            this.emit('ws:currentPrices@futures#update', data);
        } else if (event === 'df-order-update') {
            this.emit('ws:df-order-update', data);
        } else if (event === 'df-position-update') {
            this.emit('ws:df-position-update', data);
        } else if (event === 'balance-update') {
            this.emit('ws:balance-update', data);
        } else {
            this.emit(`ws:${event}`, data);
        }
    }

    _normalizeCandle(data) {
        // CoinDCX candles often use seconds, normalize to ms if needed
        return {
            open: parseFloat(data.open || data.o),
            high: parseFloat(data.high || data.h),
            low: parseFloat(data.low || data.l),
            close: parseFloat(data.close || data.c),
            volume: parseFloat(data.volume || data.v),
            time: data.time || data.t,
            pair: data.pair || data.s,
            ...data
        };
    }

    _normalizeDepth(data) {
        const normalizeSide = (side) => {
            if (Array.isArray(side)) return side.map(item => ({ price: parseFloat(item[0]), quantity: parseFloat(item[1]) }));
            return Object.entries(side).map(([price, qty]) => ({ price: parseFloat(price), quantity: parseFloat(qty) }));
        };

        return {
            bids: normalizeSide(data.bids || {}),
            asks: normalizeSide(data.asks || {}),
            timestamp: data.timestamp || data.t,
            ...data
        };
    }

    _normalizeTrade(data) {
        return {
            price: parseFloat(data.p || data.price),
            quantity: parseFloat(data.q || data.quantity),
            timestamp: data.T || data.timestamp,
            isMaker: data.m || data.isMaker,
            ...data
        };
    }

    wsSubscribe(channel) {
        if (!this.socket || !this.socket.connected) {
            throw new Error('WebSocket not connected');
        }
        this._log(`Subscribing to: ${channel}`);
        this.socket.emit('join', { channelName: channel });
        this.subscriptions.add(channel);
    }

    wsSubscribeCandles(pair, interval = '1m') {
        this.wsSubscribe(`${pair}_${interval}-futures`);
    }

    wsSubscribeOrderBook(pair, depth = 50) {
        this.wsSubscribe(`${pair}@orderbook@${depth}-futures`);
    }

    wsSubscribeTrades(pair) {
        this.wsSubscribe(`${pair}@trades-futures`);
    }

    wsSubscribePrices(pair) {
        this.wsSubscribe(`${pair}@prices-futures`);
    }

    wsSubscribeCurrentPricesFutures() {
        this.wsSubscribe('currentPrices@futures@rt');
    }

    wsSubscribeAccountFutures() {
        if (!this.apiKey) throw new Error('API Key required for account streams');
        this.socket.emit('events', {
            channelName: 'coindcx',
            authKey: this.apiKey,
        });
        this.subscriptions.add('coindcx');
    }

    wsDisconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
    }
}

module.exports = { CoinDCXFuturesClient };
