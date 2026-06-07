const axios = require('axios');
const crypto = require('crypto');
const io = require('socket.io-client');
const EventEmitter = require('events');

/**
 * CoinDCX Futures Client Library (REST + Socket.IO)
 * 
 * Provides a unified interface for CoinDCX Futures, Spot, Margin, and Lending APIs.
 * Includes automatic signature generation, data normalization, and robust WebSocket handling.
 * 
 * @version 2.1.0
 * @extends EventEmitter
 */
class CoinDCXFuturesClient extends EventEmitter {
    /**
     * @param {Object} options - Configuration options.
     * @param {string} [options.apiKey=''] - Your CoinDCX API Key.
     * @param {string} [options.apiSecret=''] - Your CoinDCX API Secret.
     * @param {boolean} [options.debug=false] - Enable console logging for requests and events.
     * @param {string} [options.apiBase='https://api.coindcx.com'] - Base URL for authenticated and general APIs.
     * @param {string} [options.publicApiBase='https://public.coindcx.com'] - Base URL for market data APIs.
     * @param {string} [options.wsBase='wss://stream.coindcx.com'] - Socket.IO endpoint.
     * @param {boolean} [options.autoReconnect=true] - Automatically reconnect WebSocket on drop.
     * @param {number} [options.reconnectDelay=5000] - Delay between reconnection attempts in ms.
     */
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || '';
        this.apiSecret = options.apiSecret || '';
        this.debug = options.debug || false;
        
        this.apiBase = options.apiBase || 'https://api.coindcx.com';
        this.publicApiBase = options.publicApiBase || 'https://public.coindcx.com';
        this.wsBase = options.wsBase || 'wss://stream.coindcx.com';
        
        this.socket = null;
        this.connected = false;
        this.subscribedChannels = new Set();
        this.pendingSubscriptions = new Set();
        this.reconnectTimer = null;
        this.pingInterval = null;
        this.isReconnecting = false;
        this.autoReconnect = options.autoReconnect !== false;
        this.reconnectDelay = options.reconnectDelay || 5000;

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

    /**
     * Returns current time in seconds (CoinDCX requirement).
     * @returns {number}
     */
    static nowSeconds() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Converts milliseconds to seconds.
     * @param {number} ms 
     * @returns {number}
     */
    static msToSeconds(ms) {
        return Math.floor(ms / 1000);
    }

    /**
     * Builds a canonical pair string.
     * @param {string} base - Target asset (e.g. BTC)
     * @param {string} target - Base asset (e.g. USDT)
     * @param {string} [ecode='B'] - Exchange code (B for Binance, I for CoinDCX)
     * @returns {string} e.g. 'B-BTC_USDT'
     */
    static buildPair(base, target, ecode = 'B') {
        return `${ecode}-${base}_${target}`;
    }

    /**
     * Parses a pair string into components.
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @returns {Object|null} { ecode, base, target }
     */
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

    /**
     * Internal: Generates HMAC-SHA256 signature for JSON payloads.
     * @private
     */
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

    /**
     * Internal: Generic request handler with auto-signing and subdomain mapping.
     * @private
     */
    async _request(method, path, data = {}, isPublic = false) {
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

    /**
     * Fetches all active futures instruments.
     * @param {string} [marginCurrency='USDT'] 
     * @returns {Promise<string[]>} List of pair strings.
     */
    async getActiveInstruments(marginCurrency = 'USDT') {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/active_instruments', { margin_currency: marginCurrency }, true);
    }

    /**
     * Fetches detailed metadata for a specific instrument.
     * Note: Documentation endpoint often 404s, uses getMarketsDetails as fallback.
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @returns {Promise<Object>}
     */
    async getInstrumentDetails(pair, marginCurrency = 'USDT') {
        const allDetails = await this.getMarketsDetails();
        return allDetails.find(m => m.pair === pair);
    }

    /**
     * Fetches historical futures candlestick data.
     * Results are automatically reversed to ascending order (oldest first).
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @param {number} [from] - Start timestamp in seconds.
     * @param {number} [to] - End timestamp in seconds.
     * @param {string} [resolution='1m'] - '1m', '5m', '15m', '1h', etc.
     * @param {number} [limit=500] - Number of candles.
     * @returns {Promise<Object[]>}
     */
    async getFuturesCandles(pair, from, to, resolution = '1m', limit = 500) {
        const params = { pair, interval: resolution };
        if (from) params.startTime = from * 1000;
        if (to) params.endTime = to * 1000;
        if (limit) params.limit = limit;

        const response = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(response) ? response.reverse() : response;
    }

    /**
     * Fetches recent futures trade history.
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @param {number} [limit=50]
     * @returns {Promise<Object[]>}
     */
    async getFuturesTradeHistory(pair, limit = 50) {
        return this._request('GET', '/market_data/trade_history', { pair, limit }, true);
    }

    /**
     * Fetches futures L2 order book.
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @returns {Promise<Object>} { bids: {}, asks: {} }
     */
    async getFuturesOrderBook(pair) {
        return this._request('GET', '/market_data/orderbook', { pair }, true);
    }

    /**
     * Fetches current ticker prices for all markets.
     * @returns {Promise<Object[]>}
     */
    async getFuturesCurrentPrices() {
        return this.getTicker();
    }

    /**
     * Fetches funding rate history for a pair.
     * @param {string} pair 
     * @param {number} [limit=50]
     * @returns {Promise<Object[]>}
     */
    async getFundingRateHistory(pair, limit = 50) {
        return this._request('GET', '/exchange/v1/derivatives/futures/data/funding_rate', { pair, limit }, true);
    }

    // --- Public Spot Market Data ---

    /**
     * Fetches spot candlestick data.
     * @param {string} pair - e.g. 'B-BTC_USDT'
     * @param {string} [interval='1m'] 
     * @param {number} [startTime] 
     * @param {number} [endTime] 
     * @param {number} [limit=500]
     */
    async getSpotCandles(pair, interval = '1m', startTime, endTime, limit = 500) {
        const params = { pair, interval };
        if (startTime) params.startTime = startTime;
        if (endTime) params.endTime = endTime;
        if (limit) params.limit = limit;
        const response = await this._request('GET', '/market_data/candles', params, true);
        return Array.isArray(response) ? response.reverse() : response;
    }

    /**
     * Fetches spot trade history.
     * @param {string} pair 
     * @param {number} [limit=50]
     */
    async getSpotTradeHistory(pair, limit = 50) {
        return this._request('GET', '/market_data/trade_history', { pair, limit }, true);
    }

    /**
     * Fetches spot L2 order book.
     * @param {string} pair 
     */
    async getSpotOrderBook(pair) {
        return this._request('GET', '/market_data/orderbook', { pair }, true);
    }

    // --- Authenticated Spot Trading ---

    /**
     * Creates a single spot order.
     * @param {Object} params - { side, order_type, market, price, quantity, client_order_id }
     */
    async createOrder(params) {
        return this._request('POST', '/exchange/v1/orders/create', params);
    }

    /**
     * Creates multiple spot orders in a single call.
     * @param {Object[]} orders - Array of order objects.
     */
    async createMultipleOrders(orders) {
        return this._request('POST', '/exchange/v1/orders/create_multiple', { orders });
    }

    /**
     * Fetches status of a single spot order.
     * @param {string|number} id - Order ID.
     */
    async getOrderStatus(id) {
        return this._request('POST', '/exchange/v1/orders/status', { id });
    }

    /**
     * Fetches status of multiple spot orders.
     * @param {Array} ids - Array of Order IDs.
     */
    async getOrderStatusMultiple(ids) {
        return this._request('POST', '/exchange/v1/orders/status_multiple', { ids });
    }

    /**
     * Lists all currently active/open spot orders.
     */
    async getActiveOrders() {
        return this._request('POST', '/exchange/v1/orders/active_orders', {});
    }

    /**
     * Cancels a single spot order.
     * @param {string|number} id 
     */
    async cancelOrder(id) {
        return this._request('POST', '/exchange/v1/orders/cancel', { id });
    }

    /**
     * Bulk cancels spot orders.
     * @param {string} [side] - 'buy' or 'sell'
     * @param {string} [market] - e.g. 'BTCUSDT'
     */
    async cancelAllOrders(side, market) {
        return this._request('POST', '/exchange/v1/orders/cancel_all', { side, market });
    }

    /**
     * Cancels specific spot orders by IDs.
     * @param {Array} ids 
     */
    async cancelOrdersByIds(ids) {
        return this._request('POST', '/exchange/v1/orders/cancel_by_ids', { ids });
    }

    /**
     * Edits the price of an existing open spot order.
     * @param {string|number} id 
     * @param {number} price 
     */
    async editOrder(id, price) {
        return this._request('POST', '/exchange/v1/orders/edit', { id, price });
    }

    /**
     * Fetches your personal spot trade history.
     * @param {string} market 
     * @param {number} [limit=50]
     */
    async getUserSpotTradeHistory(market, limit = 50) {
        return this._request('POST', '/exchange/v1/orders/trade_history', { market, limit });
    }

    // --- Authenticated Legacy Margin Trading ---

    /**
     * Places a legacy margin order.
     * @param {Object} params - { market, side, order_type, price, quantity, leverage, stop_price, target_price, sl_price }
     */
    async createMarginOrder(params) {
        return this._request('POST', '/exchange/v1/margin/create', params);
    }

    /**
     * Cancels a margin order.
     * @param {string|number} id 
     */
    async cancelMarginOrder(id) {
        return this._request('POST', '/exchange/v1/margin/cancel', { id });
    }

    /**
     * Markets-closes an open margin position.
     * @param {string|number} id - Order/Position ID.
     */
    async exitMarginPosition(id) {
        return this._request('POST', '/exchange/v1/margin/exit', { id });
    }

    /**
     * Edits the take-profit price of a margin position.
     */
    async editMarginTarget(id, target_price) {
        return this._request('POST', '/exchange/v1/margin/edit_target', { id, target_price });
    }

    /**
     * Edits the price of a pending margin target order.
     */
    async editMarginPriceOfTargetOrder(id, price) {
        return this._request('POST', '/exchange/v1/margin/edit_price_of_target_order', { id, price });
    }

    /**
     * Edits the stop-loss price of a margin position.
     */
    async editMarginSL(id, sl_price) {
        return this._request('POST', '/exchange/v1/margin/edit_sl', { id, sl_price });
    }

    /**
     * Edits the trailing stop-loss of a margin position.
     */
    async editMarginTrailingSL(id, trailing_sl) {
        return this._request('POST', '/exchange/v1/margin/edit_trailing_sl', { id, trailing_sl });
    }

    /**
     * Adds margin to an open position to lower liquidation risk.
     */
    async addMargin(id, amount) {
        return this._request('POST', '/exchange/v1/margin/add_margin', { id, amount });
    }

    /**
     * Removes margin from an open position.
     */
    async removeMargin(id, amount) {
        return this._request('POST', '/exchange/v1/margin/remove_margin', { id, amount });
    }

    /**
     * Lists open margin positions.
     */
    async fetchMarginOrders(params = {}) {
        return this._request('POST', '/exchange/v1/margin/fetch_orders', params);
    }

    /**
     * Fetches details of a single margin order.
     */
    async getMarginOrder(id) {
        return this._request('POST', '/exchange/v1/margin/order', { id });
    }

    // --- Authenticated Lending ---

    /**
     * Lists your active lending orders.
     */
    async fetchLendOrders() {
        return this._request('POST', '/exchange/v1/funding/fetch_orders', {});
    }

    /**
     * Lends funds to the platform for interest.
     * @param {string} currency - e.g. 'USDT'
     * @param {number} amount 
     * @param {string} side - 'lend'
     */
    async lend(currency, amount, side) {
        return this._request('POST', '/exchange/v1/funding/lend', { currency, amount, side });
    }

    /**
     * Settles a lending order.
     * @param {string|number} id 
     */
    async settleLendOrder(id) {
        return this._request('POST', '/exchange/v1/funding/settle', { id });
    }

    // --- Authenticated Futures Trading ---

    /**
     * Creates a new futures order (Derivatives).
     * Supports bracket orders with take_profit_price and stop_loss_price.
     * @param {Object} params - { pair, side, order_type, price, total_quantity, leverage, take_profit_price, stop_loss_price }
     */
    async createFuturesOrder(params) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/create', params);
    }

    /**
     * Lists futures orders with filters.
     * @param {Object} filters - { pair, side, status, size, page }
     */
    async listFuturesOrders(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders', filters);
    }

    /**
     * Fetches details of a single futures order.
     */
    async getFuturesOrder(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/details', { id });
    }

    /**
     * Cancels a futures order.
     */
    async cancelFuturesOrder(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel', { id });
    }

    /**
     * Bulk cancels futures orders.
     */
    async cancelAllFuturesOrders(pair, side) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/cancel_all', { pair, side });
    }

    /**
     * Edits price, quantity, or TP/SL of a futures order.
     */
    async editFuturesOrder(params) {
        return this._request('POST', '/exchange/v1/derivatives/futures/orders/edit', params);
    }

    /**
     * Lists open futures positions.
     */
    async getFuturesPositions(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions', filters);
    }

    /**
     * Market-closes an open futures position.
     */
    async closeFuturesPosition(id) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/close', { id });
    }

    /**
     * Updates leverage for a specific futures pair.
     */
    async updateLeverage(pair, leverage) {
        return this._request('POST', '/exchange/v1/derivatives/futures/leverage', { pair, leverage });
    }

    /**
     * Fetches futures transaction history (fills).
     */
    async getFuturesTransactions(filters = {}) {
        return this._request('POST', '/exchange/v1/derivatives/futures/transactions', filters);
    }

    /**
     * Adds margin to a futures position.
     */
    async addFuturesMargin(id, amount) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/add_margin', { id, amount });
    }

    /**
     * Removes margin from a futures position.
     */
    async removeFuturesMargin(id, amount) {
        return this._request('POST', '/exchange/v1/derivatives/futures/positions/remove_margin', { id, amount });
    }

    // --- Wallet & Sub-Account ---

    /**
     * Fetches ticker data for all active pairs.
     */
    async getTicker() {
        return this._request('GET', '/exchange/ticker', {}, true);
    }

    /**
     * Fetches list of all active market symbols.
     */
    async getMarkets() {
        return this._request('GET', '/exchange/v1/markets', {}, true);
    }

    /**
     * Fetches detailed metadata for all pairs.
     */
    async getMarketsDetails() {
        return this._request('GET', '/exchange/v1/markets_details', {}, true);
    }

    /**
     * Fetches your account balances.
     */
    async getBalances() {
        return this._request('POST', '/exchange/v1/users/balances', {});
    }

    /**
     * Fetches basic account/user information.
     */
    async getUserInfo() {
        return this._request('POST', '/exchange/v1/users/info', {});
    }

    /**
     * Transfers funds between spot and futures wallets.
     * @param {string} sourceWalletType - 'spot' or 'futures'
     * @param {string} destinationWalletType - 'spot' or 'futures'
     * @param {string} currencyShortName - e.g. 'USDT'
     * @param {number} amount 
     */
    async walletTransfer(sourceWalletType, destinationWalletType, currencyShortName, amount) {
        return this._request('POST', '/exchange/v1/wallets/transfer', {
            source_wallet_type: sourceWalletType,
            destination_wallet_type: destinationWalletType,
            currency_short_name: currencyShortName,
            amount
        });
    }

    /**
     * Transfers funds between master and sub-accounts (Spot wallets).
     * @param {Object} params - { fromAccountId, toAccountId, currencyShortName, amount }
     */
    async subAccountTransfer(params) {
        return this._request('POST', '/exchange/v1/wallets/sub_account_transfer', params);
    }

    // --- WebSocket (Socket.IO v2.4.0) ---

    /**
     * Connects to the CoinDCX Socket.IO server.
     * @returns {Promise<void>} Resolves on successful connection.
     * @fires ws:connect
     * @fires ws:disconnect
     * @fires ws:error
     */
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

    /**
     * Setup WebSocket event listeners and emission of normalized events.
     * @private
     */
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

    /**
     * Parses Socket.IO data which is often a JSON string.
     * @private
     */
    _parseWsData(res) {
        if (!res) return null;
        if (typeof res.data === 'string') {
            try { return JSON.parse(res.data); } catch (e) { return res.data; }
        }
        return res.data || res;
    }

    /**
     * Normalizes candlestick WebSocket data.
     * @private
     */
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

    /**
     * Normalizes depth WebSocket data from object to tuple array.
     * @private
     */
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

    /**
     * Normalizes trade WebSocket data.
     * @private
     */
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

    /**
     * Subscribes to a WebSocket channel.
     * @param {string} channel 
     */
    wsSubscribe(channel) {
        if (!this.connected) return this.pendingSubscriptions.add(channel);
        this.socket.emit('join', { channelName: channel });
        this.subscribedChannels.add(channel);
    }

    /**
     * Convenience: Subscribes to candlestick stream.
     */
    wsSubscribeCandles(pair, interval = '1m') { this.wsSubscribe(`${pair}_${interval}-futures`); }
    
    /**
     * Convenience: Subscribes to order book updates.
     */
    wsSubscribeOrderBook(pair, depth = 50) { this.wsSubscribe(`${pair}@orderbook@${depth}-futures`); }
    
    /**
     * Convenience: Subscribes to new trades.
     */
    wsSubscribeTrades(pair) { this.wsSubscribe(`${pair}@trades-futures`); }
    
    /**
     * Convenience: Subscribes to price changes.
     */
    wsSubscribePrices(pair) { this.wsSubscribe(`${pair}@prices-futures`); }
    
    /**
     * Convenience: Subscribes to batch current prices.
     */
    wsSubscribeCurrentPricesFutures() { this.wsSubscribe('currentPrices@futures@rt'); }

    /**
     * Subscribes to private account event streams (orders, positions, balances).
     * @throws {Error} If apiKey/Secret are missing.
     */
    wsSubscribeAccountFutures() {
        if (!this.apiKey || !this.apiSecret) throw new Error('API Key/Secret required for account streams');
        const channel = 'coindcx';
        const signature = this._generateSignature({ channelName: channel });
        this.socket.emit('events', { channelName: channel, authKey: this.apiKey, authSignature: signature });
        this.subscribedChannels.add(channel);
    }

    /**
     * Resubscribes to all previously active channels after a reconnect.
     * @private
     */
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

    /**
     * Disconnects the WebSocket and stops auto-reconnection.
     */
    wsDisconnect() {
        this.autoReconnect = false;
        this._stopPing();
        if (this.socket) this.socket.disconnect();
        this.connected = false;
        this._log('WS Disconnected manually');
    }
}

module.exports = { CoinDCXFuturesClient };
