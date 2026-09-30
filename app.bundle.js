(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // mobile-app/node_modules/.pnpm/@capacitor+core@8.5.2/node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+core@8.5.2/node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform2 = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform2 in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform2] === "function" ? jsImplementation = await jsImplementations[platform2]() : jsImplementation = jsImplementations[platform2];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform2}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform2}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve2) => call.then(() => resolve2({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform2] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          if (index !== -1) {
            this.listeners[eventName].splice(index, 1);
          }
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve2, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve2(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/definitions.js
  var Directory, Encoding;
  var init_definitions = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/definitions.js"() {
      (function(Directory2) {
        Directory2["Documents"] = "DOCUMENTS";
        Directory2["Data"] = "DATA";
        Directory2["Library"] = "LIBRARY";
        Directory2["Cache"] = "CACHE";
        Directory2["External"] = "EXTERNAL";
        Directory2["ExternalStorage"] = "EXTERNAL_STORAGE";
        Directory2["ExternalCache"] = "EXTERNAL_CACHE";
        Directory2["LibraryNoCloud"] = "LIBRARY_NO_CLOUD";
        Directory2["Temporary"] = "TEMPORARY";
      })(Directory || (Directory = {}));
      (function(Encoding2) {
        Encoding2["UTF8"] = "utf8";
        Encoding2["ASCII"] = "ascii";
        Encoding2["UTF16"] = "utf16";
      })(Encoding || (Encoding = {}));
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    FilesystemWeb: () => FilesystemWeb
  });
  function resolve(path) {
    const posix = path.split("/").filter((item) => item !== ".");
    const newPosix = [];
    posix.forEach((item) => {
      if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") {
        newPosix.pop();
      } else {
        newPosix.push(item);
      }
    });
    return newPosix.join("/");
  }
  function isPathParent(parent, children) {
    parent = resolve(parent);
    children = resolve(children);
    const pathsA = parent.split("/");
    const pathsB = children.split("/");
    return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
  }
  var FilesystemWeb;
  var init_web = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/web.js"() {
      init_dist();
      init_definitions();
      FilesystemWeb = class _FilesystemWeb extends WebPlugin {
        constructor() {
          super(...arguments);
          this.DB_VERSION = 1;
          this.DB_NAME = "Disc";
          this._writeCmds = ["add", "put", "delete"];
          this.downloadFile = async (options) => {
            var _a, _b;
            const requestInit = buildRequestInit(options, options.webFetchExtra);
            const response = await fetch(options.url, requestInit);
            let blob;
            if (!options.progress)
              blob = await response.blob();
            else if (!(response === null || response === void 0 ? void 0 : response.body))
              blob = new Blob();
            else {
              const reader = response.body.getReader();
              let bytes = 0;
              const chunks = [];
              const contentType = response.headers.get("content-type");
              const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
              while (true) {
                const { done, value } = await reader.read();
                if (done)
                  break;
                chunks.push(value);
                bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
                const status = {
                  url: options.url,
                  bytes,
                  contentLength
                };
                this.notifyListeners("progress", status);
              }
              const allChunks = new Uint8Array(bytes);
              let position = 0;
              for (const chunk of chunks) {
                if (typeof chunk === "undefined")
                  continue;
                allChunks.set(chunk, position);
                position += chunk.length;
              }
              blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
            }
            const result = await this.writeFile({
              path: options.path,
              directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
              recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
              data: blob
            });
            return { path: result.uri, blob };
          };
        }
        readFileInChunks(_options, _callback) {
          throw this.unavailable("Method not implemented.");
        }
        async initDb() {
          if (this._db !== void 0) {
            return this._db;
          }
          if (!("indexedDB" in window)) {
            throw this.unavailable("This browser doesn't support IndexedDB");
          }
          return new Promise((resolve2, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = _FilesystemWeb.doUpgrade;
            request.onsuccess = () => {
              this._db = request.result;
              resolve2(request.result);
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
              console.warn("db blocked");
            };
          });
        }
        static doUpgrade(event) {
          const eventTarget = event.target;
          const db = eventTarget.result;
          switch (event.oldVersion) {
            case 0:
            case 1:
            default: {
              if (db.objectStoreNames.contains("FileStorage")) {
                db.deleteObjectStore("FileStorage");
              }
              const store = db.createObjectStore("FileStorage", { keyPath: "path" });
              store.createIndex("by_folder", "folder");
            }
          }
        }
        async dbRequest(cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const req = store[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        async dbIndexRequest(indexName, cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const index = store.index(indexName);
              const req = index[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        getPath(directory, uriPath) {
          const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
          let fsPath = "";
          if (directory !== void 0)
            fsPath += "/" + directory;
          if (uriPath !== "")
            fsPath += "/" + cleanedUriPath;
          return fsPath;
        }
        async clear() {
          const conn = await this.initDb();
          const tx = conn.transaction(["FileStorage"], "readwrite");
          const store = tx.objectStore("FileStorage");
          store.clear();
        }
        /**
         * Read a file from disk
         * @param options options for the file read
         * @return a promise that resolves with the read file data result
         */
        async readFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          return { data: entry.content ? entry.content : "" };
        }
        /**
         * Write a file to disk in the specified location on device
         * @param options options for the file write
         * @return a promise that resolves with the file write result
         */
        async writeFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const doRecursive = options.recursive;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: doRecursive
              });
            }
          }
          if (!encoding && !(data instanceof Blob)) {
            data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
            if (!this.isBase64String(data))
              throw Error("The supplied data is not valid base64 content.");
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data instanceof Blob ? data.size : data.length,
            ctime: now,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
          return {
            uri: pathObj.path
          };
        }
        /**
         * Append to a file on disk in the specified location on device
         * @param options options for the file append
         * @return a promise that resolves with the file write result
         */
        async appendFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const now = Date.now();
          let ctime = now;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: true
              });
            }
          }
          if (!encoding && !this.isBase64String(data))
            throw Error("The supplied data is not valid base64 content.");
          if (occupiedEntry !== void 0) {
            if (occupiedEntry.content instanceof Blob) {
              throw Error("The occupied entry contains a Blob object which cannot be appended to.");
            }
            if (occupiedEntry.content !== void 0 && !encoding) {
              data = btoa(atob(occupiedEntry.content) + atob(data));
            } else {
              data = occupiedEntry.content + data;
            }
            ctime = occupiedEntry.ctime;
          }
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data.length,
            ctime,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Delete a file from disk
         * @param options options for the file delete
         * @return a promise that resolves with the deleted file data result
         */
        async deleteFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          if (entries.length !== 0)
            throw Error("Folder is not empty.");
          await this.dbRequest("delete", [path]);
        }
        /**
         * Create a directory.
         * @param options options for the mkdir
         * @return a promise that resolves with the mkdir result
         */
        async mkdir(options) {
          const path = this.getPath(options.directory, options.path);
          const doRecursive = options.recursive;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const depth = (path.match(/\//g) || []).length;
          const parentEntry = await this.dbRequest("get", [parentPath]);
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (depth === 1)
            throw Error("Cannot create Root directory");
          if (occupiedEntry !== void 0)
            throw Error("Current directory does already exist.");
          if (!doRecursive && depth !== 2 && parentEntry === void 0)
            throw Error("Parent directory must exist");
          if (doRecursive && depth !== 2 && parentEntry === void 0) {
            const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
            await this.mkdir({
              path: parentArgPath,
              directory: options.directory,
              recursive: doRecursive
            });
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "directory",
            size: 0,
            ctime: now,
            mtime: now
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Remove a directory
         * @param options the options for the directory remove
         */
        async rmdir(options) {
          const { path, directory, recursive } = options;
          const fullPath = this.getPath(directory, path);
          const entry = await this.dbRequest("get", [fullPath]);
          if (entry === void 0)
            throw Error("Folder does not exist.");
          if (entry.type !== "directory")
            throw Error("Requested path is not a directory");
          const readDirResult = await this.readdir({ path, directory });
          if (readDirResult.files.length !== 0 && !recursive)
            throw Error("Folder is not empty");
          for (const entry2 of readDirResult.files) {
            const entryPath = `${path}/${entry2.name}`;
            const entryObj = await this.stat({ path: entryPath, directory });
            if (entryObj.type === "file") {
              await this.deleteFile({ path: entryPath, directory });
            } else {
              await this.rmdir({ path: entryPath, directory, recursive });
            }
          }
          await this.dbRequest("delete", [fullPath]);
        }
        /**
         * Return a list of files from the directory (not recursive)
         * @param options the options for the readdir operation
         * @return a promise that resolves with the readdir directory listing result
         */
        async readdir(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (options.path !== "" && entry === void 0)
            throw Error("Folder does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          const files = await Promise.all(entries.map(async (e) => {
            let subEntry = await this.dbRequest("get", [e]);
            if (subEntry === void 0) {
              subEntry = await this.dbRequest("get", [e + "/"]);
            }
            return {
              name: e.substring(path.length + 1),
              type: subEntry.type,
              size: subEntry.size,
              ctime: subEntry.ctime,
              mtime: subEntry.mtime,
              uri: subEntry.path
            };
          }));
          return { files };
        }
        /**
         * Return full File URI for a path and directory
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async getUri(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          return {
            uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
          };
        }
        /**
         * Return data about a file
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async stat(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          if (entry === void 0)
            throw Error("Entry does not exist.");
          return {
            name: entry.path.substring(path.length + 1),
            type: entry.type,
            size: entry.size,
            ctime: entry.ctime,
            mtime: entry.mtime,
            uri: entry.path
          };
        }
        /**
         * Rename a file or directory
         * @param options the options for the rename operation
         * @return a promise that resolves with the rename result
         */
        async rename(options) {
          await this._copy(options, true);
          return;
        }
        /**
         * Copy a file or directory
         * @param options the options for the copy operation
         * @return a promise that resolves with the copy result
         */
        async copy(options) {
          return this._copy(options, false);
        }
        async requestPermissions() {
          return { publicStorage: "granted" };
        }
        async checkPermissions() {
          return { publicStorage: "granted" };
        }
        /**
         * Function that can perform a copy or a rename
         * @param options the options for the rename operation
         * @param doRename whether to perform a rename or copy operation
         * @return a promise that resolves with the result
         */
        async _copy(options, doRename = false) {
          let { toDirectory } = options;
          const { to, from, directory: fromDirectory } = options;
          if (!to || !from) {
            throw Error("Both to and from must be provided");
          }
          if (!toDirectory) {
            toDirectory = fromDirectory;
          }
          const fromPath = this.getPath(fromDirectory, from);
          const toPath = this.getPath(toDirectory, to);
          if (fromPath === toPath) {
            return {
              uri: toPath
            };
          }
          if (isPathParent(fromPath, toPath)) {
            throw Error("To path cannot contain the from path");
          }
          let toObj;
          try {
            toObj = await this.stat({
              path: to,
              directory: toDirectory
            });
          } catch (e) {
            const toPathComponents = to.split("/");
            toPathComponents.pop();
            const toPath2 = toPathComponents.join("/");
            if (toPathComponents.length > 0) {
              const toParentDirectory = await this.stat({
                path: toPath2,
                directory: toDirectory
              });
              if (toParentDirectory.type !== "directory") {
                throw new Error("Parent directory of the to path is a file");
              }
            }
          }
          if (toObj && toObj.type === "directory") {
            throw new Error("Cannot overwrite a directory with a file");
          }
          const fromObj = await this.stat({
            path: from,
            directory: fromDirectory
          });
          const updateTime = async (path, ctime2, mtime) => {
            const fullPath = this.getPath(toDirectory, path);
            const entry = await this.dbRequest("get", [fullPath]);
            entry.ctime = ctime2;
            entry.mtime = mtime;
            await this.dbRequest("put", [entry]);
          };
          const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
          switch (fromObj.type) {
            // The "from" object is a file
            case "file": {
              const file = await this.readFile({
                path: from,
                directory: fromDirectory
              });
              if (doRename) {
                await this.deleteFile({
                  path: from,
                  directory: fromDirectory
                });
              }
              let encoding;
              if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) {
                encoding = Encoding.UTF8;
              }
              const writeResult = await this.writeFile({
                path: to,
                directory: toDirectory,
                data: file.data,
                encoding
              });
              if (doRename) {
                await updateTime(to, ctime, fromObj.mtime);
              }
              return writeResult;
            }
            case "directory": {
              if (toObj) {
                throw Error("Cannot move a directory over an existing object");
              }
              try {
                await this.mkdir({
                  path: to,
                  directory: toDirectory,
                  recursive: false
                });
                if (doRename) {
                  await updateTime(to, ctime, fromObj.mtime);
                }
              } catch (e) {
              }
              const contents = (await this.readdir({
                path: from,
                directory: fromDirectory
              })).files;
              for (const filename of contents) {
                await this._copy({
                  from: `${from}/${filename.name}`,
                  to: `${to}/${filename.name}`,
                  directory: fromDirectory,
                  toDirectory
                }, doRename);
              }
              if (doRename) {
                await this.rmdir({
                  path: from,
                  directory: fromDirectory
                });
              }
            }
          }
          return {
            uri: toPath
          };
        }
        isBase64String(str) {
          try {
            return btoa(atob(str)) == str;
          } catch (err) {
            return false;
          }
        }
      };
      FilesystemWeb._debug = true;
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+share@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/share/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    ShareWeb: () => ShareWeb
  });
  var ShareWeb;
  var init_web2 = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+share@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/share/dist/esm/web.js"() {
      init_dist();
      ShareWeb = class extends WebPlugin {
        async canShare() {
          if (typeof navigator === "undefined" || !navigator.share) {
            return { value: false };
          } else {
            return { value: true };
          }
        }
        async share(options) {
          if (typeof navigator === "undefined" || !navigator.share) {
            throw this.unavailable("Share API not available in this browser");
          }
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url
          });
          return {};
        }
      };
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/haptics/dist/esm/definitions.js
  var ImpactStyle, NotificationType;
  var init_definitions2 = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/haptics/dist/esm/definitions.js"() {
      (function(ImpactStyle2) {
        ImpactStyle2["Heavy"] = "HEAVY";
        ImpactStyle2["Medium"] = "MEDIUM";
        ImpactStyle2["Light"] = "LIGHT";
      })(ImpactStyle || (ImpactStyle = {}));
      (function(NotificationType2) {
        NotificationType2["Success"] = "SUCCESS";
        NotificationType2["Warning"] = "WARNING";
        NotificationType2["Error"] = "ERROR";
      })(NotificationType || (NotificationType = {}));
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/haptics/dist/esm/web.js
  var web_exports3 = {};
  __export(web_exports3, {
    HapticsWeb: () => HapticsWeb
  });
  var HapticsWeb;
  var init_web3 = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/haptics/dist/esm/web.js"() {
      init_dist();
      init_definitions2();
      HapticsWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.selectionStarted = false;
        }
        async impact(options) {
          const pattern = this.patternForImpact(options === null || options === void 0 ? void 0 : options.style);
          this.vibrateWithPattern(pattern);
        }
        async notification(options) {
          const pattern = this.patternForNotification(options === null || options === void 0 ? void 0 : options.type);
          this.vibrateWithPattern(pattern);
        }
        async vibrate(options) {
          const duration = (options === null || options === void 0 ? void 0 : options.duration) || 300;
          this.vibrateWithPattern([duration]);
        }
        async selectionStart() {
          this.selectionStarted = true;
        }
        async selectionChanged() {
          if (this.selectionStarted) {
            this.vibrateWithPattern([70]);
          }
        }
        async selectionEnd() {
          this.selectionStarted = false;
        }
        patternForImpact(style = ImpactStyle.Heavy) {
          if (style === ImpactStyle.Medium) {
            return [43];
          } else if (style === ImpactStyle.Light) {
            return [20];
          }
          return [61];
        }
        patternForNotification(type = NotificationType.Success) {
          if (type === NotificationType.Warning) {
            return [30, 40, 30, 50, 60];
          } else if (type === NotificationType.Error) {
            return [27, 45, 50];
          }
          return [35, 65, 21];
        }
        vibrateWithPattern(pattern) {
          if (navigator.vibrate) {
            navigator.vibrate(pattern);
          } else {
            throw this.unavailable("Browser does not support the vibrate API");
          }
        }
      };
    }
  });

  // mobile-app/node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.5.2/node_modules/@capacitor/app/dist/esm/web.js
  var web_exports4 = {};
  __export(web_exports4, {
    AppWeb: () => AppWeb
  });
  var AppWeb;
  var init_web4 = __esm({
    "mobile-app/node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.5.2/node_modules/@capacitor/app/dist/esm/web.js"() {
      init_dist();
      AppWeb = class extends WebPlugin {
        constructor() {
          super();
          this.handleVisibilityChange = () => {
            const data = {
              isActive: document.hidden !== true
            };
            this.notifyListeners("appStateChange", data);
            if (document.hidden) {
              this.notifyListeners("pause", null);
            } else {
              this.notifyListeners("resume", null);
            }
          };
          document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
        }
        exitApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getInfo() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getLaunchUrl() {
          return { url: "" };
        }
        async getState() {
          return { isActive: document.hidden !== true };
        }
        async minimizeApp() {
          throw this.unimplemented("Not implemented on web.");
        }
        async toggleBackButtonHandler() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getAppLanguage() {
          return {
            value: navigator.language.split("-")[0].toLowerCase()
          };
        }
      };
    }
  });

  // mobile-app-production-v1.3.0/src/main.js
  init_dist();

  // mobile-app-production-v1.3.0/src/native.js
  init_dist();

  // mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/index.js
  init_dist();

  // mobile-app/node_modules/.pnpm/@capacitor+synapse@1.0.4/node_modules/@capacitor/synapse/dist/synapse.mjs
  function s(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return new Proxy({}, {
            get(w, o) {
              return (c, p, r) => {
                const i = t.Capacitor.Plugins[n];
                if (i === void 0) {
                  r(new Error(`Capacitor plugin ${n} not found`));
                  return;
                }
                if (typeof i[o] != "function") {
                  r(new Error(`Method ${o} not found in Capacitor plugin ${n}`));
                  return;
                }
                (async () => {
                  try {
                    const a = await i[o](c);
                    p(a);
                  } catch (a) {
                    r(a);
                  }
                })();
              };
            }
          });
        }
      }
    );
  }
  function u(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return t.cordova.plugins[n];
        }
      }
    );
  }
  function f(t = false) {
    typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
  }

  // mobile-app/node_modules/.pnpm/@capacitor+filesystem@8.1.3_@capacitor+core@8.5.2/node_modules/@capacitor/filesystem/dist/esm/index.js
  init_definitions();
  var Filesystem = registerPlugin("Filesystem", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.FilesystemWeb())
  });
  f();

  // mobile-app/node_modules/.pnpm/@capacitor+share@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/share/dist/esm/index.js
  init_dist();
  var Share = registerPlugin("Share", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.ShareWeb())
  });

  // mobile-app/node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.5.2/node_modules/@capacitor/clipboard/dist/esm/index.js
  init_dist();

  // mobile-app/node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.5.2/node_modules/@capacitor/clipboard/dist/esm/web.js
  init_dist();
  var ClipboardWeb = class extends WebPlugin {
    async write(options) {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw this.unavailable("Clipboard API not available in this browser");
      }
      if (options.string !== void 0) {
        await this.writeText(options.string);
      } else if (options.url) {
        await this.writeText(options.url);
      } else if (options.image) {
        if (typeof ClipboardItem !== "undefined") {
          try {
            const blob = await (await fetch(options.image)).blob();
            const clipboardItemInput = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([clipboardItemInput]);
          } catch (err) {
            throw new Error("Failed to write image");
          }
        } else {
          throw this.unavailable("Writing images to the clipboard is not supported in this browser");
        }
      } else {
        throw new Error("Nothing to write");
      }
    }
    async read() {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw this.unavailable("Clipboard API not available in this browser");
      }
      if (typeof ClipboardItem !== "undefined") {
        try {
          const clipboardItems = await navigator.clipboard.read();
          const type = clipboardItems[0].types[0];
          const clipboardBlob = await clipboardItems[0].getType(type);
          const data = await this._getBlobData(clipboardBlob, type);
          return { value: data, type };
        } catch (err) {
          return this.readText();
        }
      } else {
        return this.readText();
      }
    }
    async readText() {
      if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.readText) {
        throw this.unavailable("Reading from clipboard not supported in this browser");
      }
      const text = await navigator.clipboard.readText();
      return { value: text, type: "text/plain" };
    }
    async writeText(text) {
      if (typeof navigator === "undefined" || !navigator.clipboard || !navigator.clipboard.writeText) {
        throw this.unavailable("Writting to clipboard not supported in this browser");
      }
      await navigator.clipboard.writeText(text);
    }
    _getBlobData(clipboardBlob, type) {
      return new Promise((resolve2, reject) => {
        const reader = new FileReader();
        if (type.includes("image")) {
          reader.readAsDataURL(clipboardBlob);
        } else {
          reader.readAsText(clipboardBlob);
        }
        reader.onloadend = () => {
          const r = reader.result;
          resolve2(r);
        };
        reader.onerror = (e) => {
          reject(e);
        };
      });
    }
  };

  // mobile-app/node_modules/.pnpm/@capacitor+clipboard@8.0.1_@capacitor+core@8.5.2/node_modules/@capacitor/clipboard/dist/esm/index.js
  var Clipboard = registerPlugin("Clipboard", {
    web: () => new ClipboardWeb()
  });

  // mobile-app/node_modules/.pnpm/@capacitor+haptics@8.0.2_@capacitor+core@8.5.2/node_modules/@capacitor/haptics/dist/esm/index.js
  init_dist();
  init_definitions2();
  var Haptics = registerPlugin("Haptics", {
    web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.HapticsWeb())
  });

  // mobile-app/node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.5.2/node_modules/@capacitor/app/dist/esm/index.js
  init_dist();
  var App = registerPlugin("App", {
    web: () => Promise.resolve().then(() => (init_web4(), web_exports4)).then((m) => new m.AppWeb())
  });

  // mobile-app-production-v1.3.0/src/durable-store.js
  function checksum(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  }
  async function createDurableStore(io) {
    var _a, _b;
    const names = ["traffic-state-a.json", "traffic-state-b.json"];
    const existing = await io.list();
    const candidates = [];
    let damaged = 0;
    for (const name of names.filter((name2) => existing.includes(name2))) {
      try {
        const item = JSON.parse(await io.read(name));
        if (!Number.isSafeInteger(item.revision) || item.revision < 1 || typeof item.payload !== "string" || checksum(item.payload) !== item.checksum) throw new Error("Invalid snapshot");
        const values2 = JSON.parse(item.payload);
        if (!values2 || Array.isArray(values2) || typeof values2 !== "object" || Object.values(values2).some((value) => typeof value !== "string")) throw new Error("Invalid values");
        candidates.push({ ...item, values: values2 });
      } catch (e) {
        damaged++;
      }
    }
    candidates.sort((a, b) => b.revision - a.revision);
    if (!candidates.length && damaged) throw new Error("Ulo\u017Een\xE1 data nelze p\u0159e\u010D\xEDst. Nic nebylo smaz\xE1no.");
    let revision = ((_a = candidates[0]) == null ? void 0 : _a.revision) || 0;
    const values = Object.assign(/* @__PURE__ */ Object.create(null), ((_b = candidates[0]) == null ? void 0 : _b.values) || {});
    let pending = Promise.resolve();
    let failure;
    function commit() {
      if (failure) return Promise.reject(failure);
      const payload = JSON.stringify(values);
      const operation = pending.then(async () => {
        if (failure) throw failure;
        const next = revision + 1;
        const snapshot = JSON.stringify({ revision: next, payload, checksum: checksum(payload) });
        await io.write(names[next % 2], snapshot);
        revision = next;
      });
      pending = operation.catch((error) => {
        failure = error;
      });
      return operation;
    }
    return {
      recovered: damaged > 0,
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem(key, value) {
        values[key] = String(value);
        return commit();
      },
      update(entries) {
        for (const key of Object.keys(entries)) values[key] = String(entries[key]);
        return commit();
      },
      removeItem(key) {
        delete values[key];
        return commit();
      },
      async flush() {
        await pending;
        if (failure) throw failure;
      }
    };
  }

  // mobile-app-production-v1.3.0/src/native.js
  var nativeServices = { Capacitor, CapacitorHttp, Filesystem, Share, Clipboard, Haptics, App };
  async function platform(apiBase, services = {}) {
    const { Capacitor: Capacitor2, CapacitorHttp: CapacitorHttp2, Filesystem: Filesystem2, Share: Share2, Clipboard: Clipboard2, Haptics: Haptics2, App: App2 } = { ...nativeServices, ...services };
    const native = Capacitor2.isNativePlatform();
    const storage = native ? await createDurableStore({
      async list() {
        const { files } = await Filesystem2.readdir({ path: "", directory: Directory.Library });
        return files.map((file) => file.name);
      },
      async read(path) {
        return (await Filesystem2.readFile({ path, directory: Directory.Library, encoding: Encoding.UTF8 })).data;
      },
      async write(path, data) {
        await Filesystem2.writeFile({ path, data, directory: Directory.Library, encoding: Encoding.UTF8 });
      }
    }) : {
      getItem: (key) => localStorage.getItem(key),
      async setItem(key, value) {
        localStorage.setItem(key, value);
      },
      async update(entries) {
        for (const key of Object.keys(entries)) localStorage.setItem(key, entries[key]);
      },
      async removeItem(key) {
        localStorage.removeItem(key);
      },
      async flush() {
      }
    };
    let sharing = false;
    return {
      native,
      storage,
      async request(url, options) {
        if (!native) return fetch(url, options);
        if (!url.startsWith(apiBase + "/api/")) throw new Error("Unexpected API URL");
        const response = await CapacitorHttp2.request({
          url,
          method: options.method || "GET",
          headers: options.headers,
          data: options.body ? JSON.parse(options.body) : void 0,
          responseType: "json",
          connectTimeout: 45e3,
          readTimeout: 45e3,
          disableRedirects: true
        });
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          async json() {
            return typeof response.data === "string" ? JSON.parse(response.data) : response.data;
          }
        };
      },
      vibrate() {
        if (native) Haptics2.impact({ style: ImpactStyle.Light }).catch(() => {
        });
        else if (navigator.vibrate) navigator.vibrate(35);
      },
      async copy(text) {
        if (native) await Clipboard2.write({ string: text });
        else await navigator.clipboard.writeText(text);
      },
      async exportFile(blob, name) {
        if (!native) {
          const anchor = document.createElement("a");
          anchor.href = URL.createObjectURL(blob);
          anchor.download = name;
          anchor.click();
          setTimeout(() => URL.revokeObjectURL(anchor.href), 3e3);
          return;
        }
        if (sharing) return;
        sharing = true;
        try {
          const base64 = await new Promise((resolve2, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve2(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const path = "exports/" + name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const result = await Filesystem2.writeFile({ path, data: base64, directory: Directory.Cache, recursive: true });
          await Share2.share({ title: "V\xFDsledky s\u010D\xEDt\xE1n\xED", files: [result.uri], dialogTitle: "Ulo\u017Eit nebo sd\xEDlet Excel" });
        } finally {
          sharing = false;
        }
      },
      async onResume(callback) {
        if (native) await App2.addListener("appStateChange", ({ isActive }) => {
          if (isActive) callback();
        });
      }
    };
  }

  // mobile-app-production-v1.3.0/src/scoped-store.js
  function scopedStore(store, prefix) {
    return {
      get recovered() {
        return store.recovered;
      },
      getItem: (key) => store.getItem(prefix + key),
      setItem: (key, value) => store.setItem(prefix + key, value),
      removeItem: (key) => store.removeItem(prefix + key),
      update: (entries) => store.update(Object.fromEntries(Object.entries(entries).map(([k, v]) => [prefix + k, v]))),
      flush: () => store.flush()
    };
  }

  // mobile-app-production-v1.3.0/src/accounts.js
  async function initAccounts(app) {
    const panel = document.getElementById("accountPanel"), profile = document.getElementById("profile");
    const esc = (v) => String(v != null ? v : "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const errors = { server_version: "Server zat\xEDm nepou\u017E\xEDv\xE1 verzi 1.4.0. Nastavte adresu testovac\xEDho serveru.", invalid_credentials: "Nespr\xE1vn\xFD e-mail nebo heslo.", try_later: "P\u0159\xEDli\u0161 mnoho pokus\u016F. Zkuste to za 15 minut.", password_length: "Heslo mus\xED m\xEDt 12 a\u017E 128 znak\u016F.", email_exists: "Tento e-mail u\u017E m\xE1 \xFA\u010Det.", login_required: "P\u0159ihlaste se pros\xEDm znovu.", forbidden: "K t\xE9to operaci nem\xE1te opr\xE1vn\u011Bn\xED." };
    async function req(path, method = "GET", data) {
      const r = await window.trafficNativeRequest(window.SCITANI_API_BASE + "/api/" + path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : void 0 });
      const x = await r.json();
      if (!r.ok) throw Error(errors[x.error] || "Operaci se nepoda\u0159ilo dokon\u010Dit (" + x.error + ").");
      return x;
    }
    function handle(fn) {
      return async (e) => {
        e == null ? void 0 : e.preventDefault();
        try {
          await fn(e);
        } catch (err) {
          const box = panel.querySelector("[role=alert]");
          if (box) box.textContent = err.message;
          else alert(err.message);
        }
      };
    }
    function render(html) {
      document.querySelectorAll("main > section").forEach((s2) => s2.classList.add("hidden"));
      document.getElementById("bottom").classList.add("hidden");
      panel.classList.remove("hidden");
      panel.innerHTML = '<div class="panelNav"><button id="accountBack" class="btn secondary">\u2190 \xDAvod</button><span>V\xE1\u0161 pracovn\xED prostor</span></div><p role="alert" class="error"></p>' + html;
      panel.querySelector("#accountBack").onclick = () => {
        panel.classList.add("hidden");
        app.home();
      };
    }
    async function me() {
      window.trafficAccount = (await req("auth/me")).account;
      profile.textContent = window.trafficAccount ? window.trafficAccount.name : "P\u0159ihl\xE1sit se";
    }
    function login(register = false) {
      render(`<span class="eyebrow">${register ? "NOV\xDD \xDA\u010CET" : "V\xCDTEJTE ZP\u011AT"}</span><h2>${register ? "Vytvo\u0159it \xFA\u010Det s\u010D\xEDta\u010De" : "P\u0159ihl\xE1\u0161en\xED"}</h2><p class="muted">Jednor\xE1zov\xE9 s\u010D\xEDt\xE1n\xED m\u016F\u017Eete d\xE1l pou\u017E\xEDvat bez \xFA\u010Dtu.</p><form id="loginForm">${register ? '<label for="accountName">Jm\xE9no</label><input id="accountName" name="name" required maxlength="100" autocomplete="name">' : ""}<label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="username"><label for="password">Heslo</label><input id="password" name="password" type="password" required minlength="12" maxlength="128" autocomplete="${register ? "new-password" : "current-password"}"><label class="passwordToggle"><input id="showPassword" type="checkbox" aria-controls="password">Zobrazit heslo</label><button class="btn primary">${register ? "Vytvo\u0159it \xFA\u010Det" : "P\u0159ihl\xE1sit se"}</button></form><button id="switchAuth" class="btn secondary back">${register ? "U\u017E m\xE1m \xFA\u010Det" : "Vytvo\u0159it \xFA\u010Det s\u010D\xEDta\u010De"}</button>`);
      panel.querySelector("#showPassword").onchange = (e) => {
        panel.querySelector("#password").type = e.target.checked ? "text" : "password";
      };
      panel.querySelector("#switchAuth").onclick = () => login(!register);
      panel.querySelector("form").onsubmit = handle(async (e) => {
        const x = Object.fromEntries(new FormData(e.target));
        await req("auth/" + (register ? "register" : "login"), "POST", x);
        if (register) {
          login();
          panel.querySelector("[role=alert]").textContent = "\xDA\u010Det byl vytvo\u0159en. Nyn\xED se p\u0159ihlaste.";
        } else {
          await me();
          await dashboard();
        }
      });
    }
    async function dashboard() {
      await me();
      const a = window.trafficAccount;
      if (!a) return login();
      const manager = ["organizer", "admin"].includes(a.role);
      const rows = manager ? await req("dashboard") : [];
      render(`<span class="eyebrow">${a.role === "admin" ? "HLAVN\xCD SPR\xC1VCE" : a.role === "organizer" ? "ORGANIZ\xC1TOR" : "S\u010C\xCDTA\u010C"}</span><h2>Dobr\xFD den, ${esc(a.name)}.</h2><div class="toolbar"><button id="newCount" class="btn primary">\uFF0B Nov\xE9 s\u010D\xEDt\xE1n\xED</button>${a.role === "admin" ? '<button id="organizers" class="btn secondary">Spr\xE1va \xFA\u010Dt\u016F</button><button id="archive" class="btn secondary">Archiv p\u016Fvodn\xEDch s\u010D\xEDt\xE1n\xED</button>' : ""}<button id="logout" class="btn secondary">Odhl\xE1sit se</button></div>${manager ? `<div class="metrics"><div><strong>${rows.length}</strong>S\u010D\xEDt\xE1n\xED</div><div><strong>${rows.filter((s2) => !s2.ended).length}</strong>Prob\xEDh\xE1</div><div><strong>${rows.reduce((n, s2) => n + s2.vehicles, 0)}</strong>Vozidel</div></div><h3>${a.role === "admin" ? "V\u0161echna s\u010D\xEDt\xE1n\xED" : "Moje s\u010D\xEDt\xE1n\xED a historie"}</h3><label for="filter">Vyhledat lokalitu, skupinu nebo k\xF3d</label><input id="filter" placeholder="Hledat\u2026"><div id="counts"></div>` : "<p>Pro p\u0159ipojen\xED ke s\u010D\xEDt\xE1n\xED pou\u017Eijte k\xF3d od organiz\xE1tora.</p>"}`);
      panel.querySelector("#newCount").onclick = () => {
        panel.classList.add("hidden");
        app.create();
      };
      panel.querySelector("#logout").onclick = handle(async () => {
        await req("auth/logout", "POST", {});
        await me();
        login();
      });
      if (a.role === "admin") {
        panel.querySelector("#organizers").onclick = handle(accounts);
        panel.querySelector("#archive").onclick = handle(archive);
      }
      if (manager) {
        const draw = () => {
          const term = panel.querySelector("#filter").value.toLocaleLowerCase("cs");
          panel.querySelector("#counts").innerHTML = rows.filter((s2) => {
            var _a;
            return [s2.place, s2.group, s2.code, (_a = s2.owner) == null ? void 0 : _a.name].join(" ").toLocaleLowerCase("cs").includes(term);
          }).map((s2) => {
            var _a;
            return `<article class="countCard"><div class="countHead"><span class="badge ${s2.ended ? "closed" : ""}">${s2.ended ? "Dokon\u010Deno" : "Prob\xEDh\xE1"}</span><code>${esc(s2.code)}</code></div><h3>${esc(s2.place)}</h3><p>${esc(s2.station)} \xB7 ${esc(s2.group)}</p><p class="muted">${new Date(s2.created).toLocaleString("cs-CZ")}<br>Organiz\xE1tor: ${esc(((_a = s2.owner) == null ? void 0 : _a.name) || "Host / p\u016Fvodn\xED s\u010D\xEDt\xE1n\xED")}</p><div class="countStats"><b>${s2.vehicles} vozidel</b><span>${s2.activeUsers} aktivn\xEDch / ${s2.users} s\u010D\xEDta\u010D\u016F</span></div><button class="btn secondary" data-open="${s2.code}">Spr\xE1va, v\xFDsledky a Excel \u2192</button></article>`;
          }).join("") || '<p class="muted">Zat\xEDm zde nen\xED \u017E\xE1dn\xE9 s\u010D\xEDt\xE1n\xED.</p>';
          panel.querySelectorAll("[data-open]").forEach((b) => b.onclick = handle(async () => {
            await app.open(b.dataset.open);
            panel.classList.add("hidden");
          }));
        };
        panel.querySelector("#filter").oninput = draw;
        draw();
      }
    }
    async function archive() {
      const rows = await req("archive");
      render(`<h2>Archiv p\u016Fvodn\xEDch s\u010D\xEDt\xE1n\xED</h2><p>Historick\xE9 v\xFDsledky pouze pro \u010Dten\xED. Excel zachov\xE1v\xE1 p\u016Fvodn\xED export; neobsahuje \xFAplnou z\xE1lohu serveru.</p><button id="backDashboard" class="btn secondary">\u2190 P\u0159ehled s\u010D\xEDt\xE1n\xED</button>${rows.map((s2) => `<article class="countCard"><code>${esc(s2.code)}</code><h3>${esc(s2.place)}</h3><p>Stanovi\u0161t\u011B ${esc(s2.station)} \xB7 Skupina ${esc(s2.group)}</p><p>${esc(s2.date)} \xB7 ${s2.records} vozidel \xB7 ${s2.participants} s\u010D\xEDta\u010D\u016F</p><p class="muted">${s2.originalIds ? "Export obsahuje p\u016Fvodn\xED ID a p\u0159esn\xE9 \u010Dasov\xE9 \xFAdaje." : "Export neobsahuje p\u016Fvodn\xED ID; \u010Das je ulo\u017Een na sekundy."}</p><button class="btn secondary" data-archive="${esc(s2.code)}">St\xE1hnout p\u016Fvodn\xED Excel</button></article>`).join("") || "<p>Archiv je zat\xEDm pr\xE1zdn\xFD.</p>"}`);
      panel.querySelector("#backDashboard").onclick = handle(dashboard);
      panel.querySelectorAll("[data-archive]").forEach((b) => b.onclick = handle(async () => {
        const x = await req("archive/" + b.dataset.archive);
        const bytes = Uint8Array.from(atob(x.base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        if (window.trafficArchiveExport) {
          await window.trafficArchiveExport(blob, x.filename);
        } else {
          const url = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = url;
          link.download = x.filename;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 6e4);
        }
      }));
    }
    async function accounts() {
      const rows = await req("accounts");
      render(`<span class="eyebrow">ADMINISTRACE</span><h2>Organiz\xE1to\u0159i a u\u017Eivatel\xE9</h2><button id="backDashboard" class="btn secondary">\u2190 P\u0159ehled s\u010D\xEDt\xE1n\xED</button><div id="accountList">${rows.map((a) => `<article class="countCard"><h3>${esc(a.name)}</h3><p>${esc(a.email)} \xB7 ${esc(a.role)} \xB7 ${a.active ? "Aktivn\xED" : "Deaktivovan\xFD"}</p>${a.role !== "admin" ? `<button class="btn secondary" data-edit="${a.id}">Upravit \xFA\u010Det</button> <button class="btn secondary" data-toggle="${a.id}">${a.active ? "Deaktivovat" : "Aktivovat"}</button>` : ""}</article>`).join("")}</div><h3 id="editTitle">Nov\xFD \xFA\u010Det</h3><form id="accountForm"><input name="id" type="hidden"><label>Jm\xE9no<input name="name" required maxlength="100"></label><label>E-mail<input name="email" type="email" required></label><label>Role<select name="role"><option value="organizer">Organiz\xE1tor</option><option value="user">S\u010D\xEDta\u010D</option></select></label><label>Heslo (12\u2013128 znak\u016F; p\u0159i \xFAprav\u011B pr\xE1zdn\xE9 = beze zm\u011Bny)<input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password"></label><button class="btn primary">Ulo\u017Eit \xFA\u010Det</button></form>`);
      panel.querySelector("#backDashboard").onclick = handle(dashboard);
      const form = panel.querySelector("form");
      panel.querySelectorAll("[data-edit]").forEach((b) => b.onclick = () => {
        const a = rows.find((a2) => a2.id === b.dataset.edit);
        for (const k of ["id", "name", "email", "role"]) form.elements[k].value = a[k];
        form.elements.email.disabled = true;
        panel.querySelector("#editTitle").textContent = "Upravit \xFA\u010Det";
        form.scrollIntoView({ behavior: "smooth" });
      });
      panel.querySelectorAll("[data-toggle]").forEach((b) => b.onclick = handle(async () => {
        const a = rows.find((a2) => a2.id === b.dataset.toggle);
        if (!confirm(`${a.active ? "Deaktivovat" : "Aktivovat"} \xFA\u010Det ${a.name}?`)) return;
        await req("accounts/" + a.id, "PATCH", { active: !a.active });
        await accounts();
      }));
      form.onsubmit = handle(async () => {
        const x = Object.fromEntries(new FormData(form));
        const id = x.id;
        delete x.id;
        if (!x.password) delete x.password;
        await req("accounts" + (id ? "/" + id : ""), id ? "PATCH" : "POST", x);
        await accounts();
      });
    }
    profile.onclick = handle(async () => {
      if (app.busy()) return alert("Nejprve dokon\u010Dete sv\xE9 aktu\xE1ln\xED s\u010D\xEDt\xE1n\xED.");
      await dashboard();
    });
    try {
      await me();
    } catch (e) {
      profile.textContent = "P\u0159ihl\xE1sit se";
    }
  }

  // mobile-app-production-v1.3.0/src/sheet-gesture.js
  function enableSheetSwipe(sheet) {
    let start = null, dragging = false, offset = 0, suppressClickUntil = 0;
    const reset = () => {
      sheet.style.removeProperty("transform");
      sheet.style.removeProperty("transition");
      start = null;
      dragging = false;
      offset = 0;
    };
    sheet.addEventListener("touchstart", (e) => {
      reset();
      if (!sheet.classList.contains("open") || e.touches.length !== 1 || sheet.scrollTop > 0 || e.target.closest("button,a,input,select,textarea")) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (!start) return;
      if (e.touches.length !== 1) {
        reset();
        return;
      }
      const dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
      if (!dragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > dy || sheet.scrollTop > 0) {
          reset();
          return;
        }
        dragging = true;
        sheet.style.transition = "none";
      }
      if (e.cancelable) e.preventDefault();
      offset = Math.max(0, dy);
      sheet.style.transform = "translateY(" + offset + "px)";
    }, { passive: false });
    sheet.addEventListener("touchend", () => {
      if (dragging) {
        suppressClickUntil = Date.now() + 400;
        if (offset >= 55) sheet.classList.remove("open");
      }
      reset();
    }, { passive: true });
    sheet.addEventListener("touchcancel", reset, { passive: true });
    sheet.addEventListener("click", (e) => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  // mobile-app-production-v1.3.0/src/app.js
  async function initApp(platform2) {
    enableSheetSwipe(document.getElementById("sheet"));
    const { storage, native } = platform2;
    const APP_VERSION = "1.4.0";
    const IS_HOSTED = native || /^https?:$/.test(location.protocol);
    let storageUnavailable = false;
    function savedApiBase() {
      try {
        return storage.getItem("trafficApiBase") || "";
      } catch (e) {
        storageUnavailable = true;
        return "";
      }
    }
    const API_BASE = (window.SCITANI_API_BASE || savedApiBase()).replace(/\/$/, "");
    async function requireStorage() {
      const key = "trafficStorageProbe:" + Date.now() + ":" + Math.random();
      try {
        await storage.setItem(key, "1");
        await storage.removeItem(key);
        sessionStorage.setItem(key, "1");
        sessionStorage.removeItem(key);
        storageUnavailable = false;
        return true;
      } catch (e) {
        storageUnavailable = true;
        netStatus();
        alert("Pro bezpe\u010Dn\xE9 ukl\xE1d\xE1n\xED s\u010D\xEDt\xE1n\xED je pot\u0159eba dostupn\xE9 \xFAlo\u017Ei\u0161t\u011B a dostatek m\xEDsta. \u017D\xE1dn\xE1 ulo\u017Een\xE1 data nebyla smaz\xE1na.");
        return false;
      }
    }
    function recordId() {
      return window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : Date.now() + "-" + Math.random();
    }
    const cats = ["\u{1F697} Osobn\xED auta", "\u{1F69A} N\xE1kladn\xED auta", "\u{1F69B} Kamiony", "\u{1F68C} Autobusy"];
    let directions = [{ name: "", moves: [] }, { name: "", moves: [] }], current = null, records = [], selectedDir = null, started = null, timer = null, isCreator = false, lastActivityAt = Date.now(), presencePromptFor = 0, finishArmed = false;
    const $ = (id) => document.getElementById(id), screens = ["home", "setup", "created", "join", "selectScreen", "admin", "adminEndConfirm", "finishUser", "finishAdmin", "count"];
    function show(id) {
      screens.forEach((x) => $(x).classList.toggle("hidden", x !== id));
      $("bottom").classList.toggle("hidden", id !== "count");
    }
    ;
    function vib() {
      try {
        platform2.vibrate();
      } catch (e) {
      }
    }
    ;
    function esc(s2) {
      return String(s2 == null ? "" : s2).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
    }
    ;
    function code() {
      const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join("");
    }
    ;
    function renderDirs() {
      let host = $("dirs");
      host.innerHTML = "";
      directions.forEach((d, i) => {
        let c = document.createElement("div");
        c.className = "directionCard";
        c.innerHTML = `<div class="directionHead"><div><label>Sm\u011Br ${i + 1}</label><input data-dir="${i}" value="${esc(d.name)}" placeholder="nap\u0159. P\u0159\xEDjezd od Prahy"></div>${i > 1 ? `<button class="btn secondary" data-del-dir="${i}">\u2715</button>` : ""}</div><div id="moves-${i}"></div><button class="btn secondary" style="margin-top:10px" data-add-move="${i}">\uFF0B P\u0159idat pohyb / odbo\u010Den\xED</button>`;
        host.appendChild(c);
        renderMoves(i);
      });
      host.querySelectorAll("[data-dir]").forEach((x) => x.oninput = (e) => directions[+e.target.dataset.dir].name = e.target.value);
      host.querySelectorAll("[data-del-dir]").forEach((x) => x.onclick = (e) => {
        vib();
        directions.splice(+e.currentTarget.dataset.delDir, 1);
        renderDirs();
      });
      host.querySelectorAll("[data-add-move]").forEach((x) => x.onclick = (e) => {
        vib();
        directions[+e.currentTarget.dataset.addMove].moves.push("");
        renderDirs();
      });
    }
    function renderMoves(i) {
      let h = $("moves-" + i);
      h.innerHTML = directions[i].moves.map((m, j) => `<div class="movementRow"><input data-mi="${j}" value="${esc(m)}" placeholder="nap\u0159. vlevo / rovn\u011B / vpravo"><button class="btn secondary" data-dm="${j}">\u2715</button></div>`).join("");
      h.querySelectorAll("[data-mi]").forEach((x) => x.oninput = (e) => directions[i].moves[+e.target.dataset.mi] = e.target.value);
      h.querySelectorAll("[data-dm]").forEach((x) => x.onclick = (e) => {
        vib();
        directions[i].moves.splice(+e.currentTarget.dataset.dm, 1);
        renderDirs();
      });
    }
    ;
    renderDirs();
    $("createHome").onclick = () => {
      vib();
      show("setup");
    };
    $("joinHome").onclick = () => {
      vib();
      show("join");
    };
    document.querySelectorAll("[data-home]").forEach((b) => b.onclick = () => show("home"));
    $("addDir").onclick = () => {
      vib();
      directions.push({ name: "", moves: [] });
      renderDirs();
    };
    function db() {
      return JSON.parse(storage.getItem("trafficSessions") || "{}");
    }
    async function saveDB(d) {
      await storage.setItem("trafficSessions", JSON.stringify(d));
    }
    async function persist() {
      if (!current) return;
      let d = db();
      d[current.code] = current;
      await saveDB(d);
    }
    function queueCount() {
      try {
        return JSON.parse(storage.getItem("trafficQueue") || "[]").length;
      } catch (e) {
        return 0;
      }
    }
    function netStatus(mode) {
      let b = $("netbar"), q = queueCount();
      if (storageUnavailable) {
        b.className = "netbar offline";
        b.textContent = "\xDAlo\u017Ei\u0161t\u011B nen\xED dostupn\xE9 \xB7 povolte ukl\xE1d\xE1n\xED dat pro tento web";
        return;
      }
      if (!IS_HOSTED) {
        b.className = "netbar offline";
        b.textContent = "Lok\xE1ln\xED testovac\xED re\u017Eim \xB7 p\u0159ipojen\xED mezi telefony nen\xED aktivn\xED";
        return;
      }
      if (mode === "sync") {
        b.className = "netbar sync";
        b.textContent = "\u21BB Synchronizuji\u2026";
        return;
      }
      if (!navigator.onLine) {
        b.className = "netbar offline";
        b.textContent = "\u25CF Offline \xB7 " + q + " z\xE1znam\u016F \u010Dek\xE1 na odesl\xE1n\xED";
        return;
      }
      b.className = q ? "netbar sync" : "netbar online";
      b.textContent = q ? "\u25CF Online \xB7 " + q + " z\xE1znam\u016F \u010Dek\xE1 na synchronizaci" : "\u25CF Online \xB7 v\u0161e synchronizov\xE1no";
    }
    function participantToken(code2, id) {
      return storage.getItem("trafficParticipant:" + code2 + ":" + id) || "";
    }
    function adminToken(code2) {
      return storage.getItem("trafficAdminToken:" + code2) || "";
    }
    async function apiResult(path, opt = {}) {
      if (!IS_HOSTED) return { ok: false, kind: "local", status: 0 };
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      let timeout;
      try {
        const requestPath = (!opt.method || opt.method === "GET") && /^\/sessions\/[A-Z0-9]{6}$/.test(path) ? path + "?summary=1" : path;
        const request = platform2.request(API_BASE + "/api" + requestPath, { ...opt, headers: { "Content-Type": "application/json", ...opt.headers || {} }, ...controller ? { signal: controller.signal } : {} }).then(async (r) => {
          let data;
          try {
            data = await r.json();
          } catch (e) {
            return { ok: false, kind: "response", status: r.status };
          }
          if (r.ok && data.pagedRecords) {
            const all = [];
            let after = "", pages = 0;
            do {
              const page = await apiResult("/sessions/" + encodeURIComponent(data.code) + "/records?after=" + encodeURIComponent(after));
              if (!page.ok) return page;
              if (!Array.isArray(page.data.records) || ++pages > 2e3) return { ok: false, kind: "response", status: 0 };
              all.push(...page.data.records);
              const next = page.data.next;
              if (next !== null && (typeof next !== "string" || next <= after)) return { ok: false, kind: "response", status: 0 };
              after = next;
            } while (after);
            data.records = all;
            delete data.pagedRecords;
          }
          return { ok: r.ok, kind: r.ok ? "success" : "http", status: r.status, data };
        });
        const expired = new Promise((resolve2) => {
          timeout = setTimeout(() => {
            resolve2({ ok: false, kind: "timeout", status: 0 });
            if (controller) controller.abort();
          }, 45e3);
        });
        return await Promise.race([request, expired]);
      } catch (e) {
        console.warn("API request failed:", e.message);
        return { ok: false, kind: "network", status: 0 };
      } finally {
        clearTimeout(timeout);
      }
    }
    async function api(path, opt = {}) {
      const result = await apiResult(path, opt);
      if (!result.ok) {
        netStatus();
        return null;
      }
      return result.data;
    }
    function apiProblem(result) {
      if (result.kind === "timeout") return "Server zat\xEDm neodpov\xEDd\xE1. M\u016F\u017Ee se probouzet po ne\u010Dinnosti. Za chv\xEDli to zkuste znovu.";
      if (result.kind === "network") return "Se serverem se nepoda\u0159ilo spojit. Ov\u011B\u0159te internet a stejnou HTTPS adresu aplikace na obou telefonech.";
      if (result.kind === "response") return "Server nevr\xE1til o\u010Dek\xE1vanou odpov\u011B\u010F aplikace. Ov\u011B\u0159te dostupnost serveru aplikace.";
      return "Server po\u017Eadavek odm\xEDtl (HTTP " + result.status + "). Zkuste to za chv\xEDli znovu.";
    }
    function validSession(s2) {
      return !!(s2 && typeof s2.code === "string" && Array.isArray(s2.directions) && Array.isArray(s2.users) && Array.isArray(s2.records));
    }
    async function syncCurrent() {
      if (!current) return null;
      let x = await api("/sessions/" + current.code);
      if (x) {
        const pending = JSON.parse(storage.getItem("trafficQueue") || "[]").filter((q) => q.code === x.code);
        for (const q of pending) {
          x.records = x.records.filter((r) => r.id !== q.record.id);
          if (q.action !== "delete") x.records.push(q.record);
        }
        current = x;
        await persist();
      }
      return x;
    }
    let syncing = null;
    async function flushQueue() {
      if (syncing) return syncing;
      syncing = (async () => {
        netStatus("sync");
        while (true) {
          const batch = JSON.parse(storage.getItem("trafficQueue") || "[]");
          if (!batch.length) break;
          let failed = false;
          for (const x of batch) {
            const uid = x.record.userId;
            const local = db()[x.code], user = local == null ? void 0 : local.users.find((u2) => u2.id === uid);
            if (user) {
              const joined = await apiResult("/sessions/" + x.code + "/users", { method: "POST", headers: { "X-Participant-Token": participantToken(x.code, uid) }, body: JSON.stringify(user) });
              if (!joined.ok && joined.status !== 409) {
                failed = true;
                continue;
              }
            }
            const result = x.action === "delete" ? await apiResult("/sessions/" + x.code + "/records/" + encodeURIComponent(x.record.id), { method: "DELETE", headers: { "X-User-ID": x.record.userId || "", "X-Participant-Token": participantToken(x.code, x.record.userId) } }) : await apiResult("/sessions/" + x.code + "/records", { method: "POST", headers: { "X-Participant-Token": participantToken(x.code, x.record.userId) }, body: JSON.stringify(x.record) });
            const ok = result.ok || x.action === "delete" && result.status === 404;
            if (!ok) {
              failed = true;
              continue;
            }
            const latest = JSON.parse(storage.getItem("trafficQueue") || "[]");
            await storage.setItem("trafficQueue", JSON.stringify(latest.filter((item) => !(item.code === x.code && item.record.id === x.record.id && (item.action || "add") === (x.action || "add")))));
          }
          if (failed) break;
        }
      })();
      try {
        await syncing;
      } finally {
        syncing = null;
        netStatus();
      }
    }
    window.addEventListener("online", flushQueue);
    window.addEventListener("offline", () => netStatus());
    netStatus();
    $("createCount").onclick = async () => {
      vib();
      if (!await requireStorage()) return;
      let p = $("place").value.trim(), s2 = $("station").value.trim(), g = $("group").value.trim(), hourlyRate = Math.max(0, Number($("hourlyRate")?.value || 0));
      if (!p || !s2 || !g || directions.length < 2 || directions.some((d) => !d.name.trim() || d.moves.some((m) => !m.trim()))) return alert("Vypl\u0148te \xFAdaje, minim\xE1ln\u011B dva sm\u011Bry a n\xE1zvy v\u0161ech p\u0159idan\xFDch pohyb\u016F.");
      const button = $("createCount");
      if (button.disabled) return;
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "VYTV\xC1\u0158\xCDM S\u010C\xCDT\xC1N\xCD\u2026";
      try {
        let c = code(), candidate = { code: c, place: p, station: s2, group: g, hourlyRate, directions: JSON.parse(JSON.stringify(directions)), users: [], records: [], created: (/* @__PURE__ */ new Date()).toISOString(), ended: false }, token;
        if (IS_HOSTED) {
          const result = await apiResult("/sessions", { method: "POST", body: JSON.stringify(candidate) });
          if (!result.ok) return alert("Vytvo\u0159en\xED spole\u010Dn\xE9ho s\u010D\xEDt\xE1n\xED nebylo potvrzeno. " + apiProblem(result));
          const remote = result.data;
          if (!remote || !validSession(remote.session) || typeof remote.adminToken !== "string" || !remote.adminToken) return alert("Server nepotvrdil platn\xE9 spole\u010Dn\xE9 s\u010D\xEDt\xE1n\xED se spr\xE1vcovsk\xFDm opr\xE1vn\u011Bn\xEDm. Ov\u011B\u0159te, \u017Ee pou\u017E\xEDv\xE1te aktu\xE1ln\xED adresu aplikace.");
          candidate = remote.session;
          token = remote.adminToken;
        } else token = "LOCAL-" + c + "-" + Date.now();
        const saved = db();
        saved[candidate.code] = candidate;
        await saveDB(saved);
        await storage.setItem("trafficAdminToken:" + candidate.code, token);
        await storage.setItem("trafficRole:" + candidate.code, "admin");
        current = candidate;
        isCreator = true;
        $("createdCode").textContent = current.code;
        show("created");
      } catch (e) {
        console.error("Create failed:", e);
        alert("Nepoda\u0159ilo se bezpe\u010Dn\u011B ulo\u017Eit s\u010D\xEDt\xE1n\xED do tohoto za\u0159\xEDzen\xED. Ov\u011B\u0159te dostupnost \xFAlo\u017Ei\u0161t\u011B.");
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    };
    $("copyCode").onclick = async () => {
      vib();
      try {
        await platform2.copy(current.code);
        alert("K\xF3d zkop\xEDrov\xE1n.");
      } catch (e) {
        alert("K\xF3d: " + current.code);
      }
    };
    $("toAdmin").onclick = () => {
      vib();
      renderAdmin();
      show("admin");
    };
    $("creatorChoose").onclick = () => {
      vib();
      openSelect();
    };
    $("joinBtn").onclick = async () => {
      vib();
      if (!await requireStorage()) return;
      let c = $("joinCode").value.trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(c)) return alert("Zadejte cel\xFD \u0161estim\xEDstn\xFD p\u0159ipojovac\xED k\xF3d.");
      const button = $("joinBtn");
      if (button.disabled) return;
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "NA\u010C\xCDT\xC1M S\u010C\xCDT\xC1N\xCD\u2026";
      try {
        let d;
        if (IS_HOSTED) {
          const result = await apiResult("/sessions/" + encodeURIComponent(c));
          if (result.ok) {
            d = result.data;
            if (!validSession(d) || d.code !== c) return alert("Server nevr\xE1til platn\xE9 \xFAdaje s\u010D\xEDt\xE1n\xED. Ov\u011B\u0159te nasazen\xED aplikace.");
          } else if (result.status === 404) return alert("S\u010D\xEDt\xE1n\xED s k\xF3dem " + c + " na tomto serveru neexistuje. Ov\u011B\u0159te k\xF3d a stejnou adresu aplikace na obou telefonech. Star\u0161\xED k\xF3d mohl vzniknout pouze lok\xE1ln\u011B nebo se serverov\xE1 data mohla ztratit p\u0159i nov\xE9m nasazen\xED. Spr\xE1vce mus\xED vytvo\u0159it nov\xE9 spole\u010Dn\xE9 s\u010D\xEDt\xE1n\xED.");
          else if (result.kind === "network" || result.kind === "timeout") {
            d = db()[c];
            if (!d) return alert(apiProblem(result));
          } else return alert(apiProblem(result));
        } else d = db()[c];
        if (!d) return alert("V tomto za\u0159\xEDzen\xED s\u010D\xEDt\xE1n\xED s t\xEDmto k\xF3dem nen\xED. Pro p\u0159ipojen\xED mezi telefony otev\u0159ete na obou stejnou HTTPS adresu aplikace.");
        if (!validSession(d)) return alert("Ulo\u017Een\xE9 \xFAdaje s\u010D\xEDt\xE1n\xED nejsou platn\xE9.");
        if (d.ended) return alert("Toto s\u010D\xEDt\xE1n\xED ji\u017E bylo ukon\u010Deno.");
        current = d;
        await persist();
        isCreator = storage.getItem("trafficRole:" + c) === "admin" && !!adminToken(c);
        openSelect();
      } catch (e) {
        console.error("Join failed:", e);
        alert("Nepoda\u0159ilo se na\u010D\xEDst nebo ulo\u017Eit \xFAdaje s\u010D\xEDt\xE1n\xED. Ov\u011B\u0159te dostupnost \xFAlo\u017Ei\u0161t\u011B tohoto za\u0159\xEDzen\xED.");
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    };
    function openSelect() {
      var _a;
      selectedDir = null;
      $("userName").value = ((_a = window.trafficAccount) == null ? void 0 : _a.name) || "";
      $("countInfo").innerHTML = `<b>${esc(current.place)}</b> \xB7 ${esc(current.station)} \xB7 ${esc(current.group)}<br>K\xF3d: <b>${esc(current.code)}</b>`;
      let h = $("selectDirs");
      h.innerHTML = "";
      current.directions.forEach((d, i) => {
        let b = document.createElement("button");
        b.className = "btn selectBtn";
        b.innerHTML = `<b>${esc(d.name)}</b><div class="muted">${d.moves.length ? d.moves.map(esc).join(" \xB7 ") : "Bez rozli\u0161en\xED pohyb\u016F"}</div>`;
        b.onclick = () => {
          vib();
          selectedDir = i;
          h.querySelectorAll("button").forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
        };
        h.appendChild(b);
      });
      show("selectScreen");
    }
    ;
    $("backFromSelect").onclick = () => {
      vib();
      isCreator ? (renderAdmin(), show("admin")) : show("home");
    };
    $("start").onclick = async () => {
      vib();
      if (!await requireStorage()) return;
      const n = $("userName").value.trim();
      if (!n) return alert("Zadejte sv\xE9 jm\xE9no.");
      if (selectedDir === null) return alert("Vyberte sm\u011Br s\u010D\xEDt\xE1n\xED.");
      const uid = recordId(), u2 = { id: uid, name: n, direction: current.directions[selectedDir].name, joined: (/* @__PURE__ */ new Date()).toISOString() };
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, "0")).join("");
      await storage.setItem("trafficParticipant:" + current.code + ":" + uid, secret);
      const result = await apiResult("/sessions/" + current.code + "/users", { method: "POST", headers: { "X-Participant-Token": secret }, body: JSON.stringify(u2) });
      if (!result.ok) return alert("Pro zah\xE1jen\xED se nejprve p\u0159ipojte k internetu. " + apiProblem(result));
      current.users.push(u2);
      await persist();
      sessionStorage.setItem("trafficUser", JSON.stringify({ id: uid, name: n, code: current.code }));
      records = [];
      started = Date.now();
      lastActivityAt = started;
      presencePromptFor = 0;
      finishArmed = false;
      await storage.setItem("trafficActive", JSON.stringify({ id: uid, name: n, code: current.code, started, direction: u2.direction, lastActivityAt }));
      $("placeShow").textContent = current.place;
      $("meta").textContent = [current.station, current.group, n, "K\xF3d " + current.code].join(" \xB7 ");
      $("directionShow").textContent = "S\u010D\xEDt\xE1te: " + u2.direction;
      renderButtons();
      show("count");
      clearInterval(timer);
      timer = setInterval(tick, 1e3);
      tick();
    };
    function tick() {
      let s2 = Math.floor((Date.now() - started) / 1e3);
      $("clock").textContent = [Math.floor(s2 / 3600), Math.floor(s2 % 3600 / 60), s2 % 60].map((x) => String(x).padStart(2, "0")).join(":");
    }
    ;
    function renderButtons() {
      let h = $("buttons");
      h.innerHTML = "";
      let d = current.directions[selectedDir], moves = d.moves.length ? d.moves : [null];
      moves.forEach((m) => {
        let box = document.createElement("div");
        box.className = "card";
        if (m !== null) box.innerHTML = `<div class="movementTitle">${esc(m)}</div>`;
        let g = document.createElement("div");
        g.className = "grid";
        cats.forEach((c, ci) => {
          let b = document.createElement("button");
          b.className = "btn vehicle";
          b.textContent = c;
          b.onclick = () => add(ci, m);
          g.appendChild(b);
        });
        box.appendChild(g);
        h.appendChild(box);
      });
    }
    ;
    async function add(ci, m) {
      vib();
      lastActivityAt = Date.now();
      presencePromptFor = 0;
      const activeNow = JSON.parse(storage.getItem("trafficActive") || "null");
      if (activeNow) { activeNow.lastActivityAt = lastActivityAt; await storage.setItem("trafficActive", JSON.stringify(activeNow)); }
      const u2 = JSON.parse(sessionStorage.getItem("trafficUser"));
      const r = { id: recordId(), time: (/* @__PURE__ */ new Date()).toISOString(), userId: u2.id, user: u2.name, direction: current.directions[selectedDir].name, movement: m || "", category: cats[ci].replace(/^.. /, "") };
      records.push(r);
      current.records.push(r);
      const sessions = db();
      sessions[current.code] = current;
      const q = JSON.parse(storage.getItem("trafficQueue") || "[]");
      q.push({ code: current.code, record: r });
      await storage.update({ trafficSessions: JSON.stringify(sessions), trafficQueue: JSON.stringify(q) });
      flushQueue().catch((e) => {
        console.error(e);
        netStatus();
      });
    }
    ;
    $("bottom").onclick = () => {
      vib();
      showStats();
      $("sheet").classList.add("open");
    };
    document.querySelector(".handle").onclick = () => $("sheet").classList.remove("open");
    function showStats() {
      let st = $("stats");
      st.innerHTML = "";
      let d = current.directions[selectedDir], moves = d.moves.length ? d.moves : [""];
      moves.forEach((m) => cats.forEach((c) => {
        let n = c.replace(/^.. /, ""), v = records.filter((r) => r.movement === m && r.category === n).length;
        if (v) st.innerHTML += `<div class="stat"><span>${m ? esc(m) + " \xB7 " : ""}${esc(n)}</span><b>${v}</b></div>`;
      }));
      if (!st.children.length) st.innerHTML = '<span class="muted">Zat\xEDm bez z\xE1znam\u016F.</span>';
      $("recent").innerHTML = records.slice(-6).reverse().map((r) => `<div class="stat"><span>${new Date(r.time).toLocaleTimeString("cs-CZ")} \xB7 ${esc(r.category)}${r.movement ? " \xB7 " + esc(r.movement) : ""}</span><small>${esc(r.direction)}</small></div>`).join("") || '<span class="muted">Zat\xEDm bez z\xE1znam\u016F.</span>';
    }
    ;
    $("undo").onclick = async () => {
      vib();
      const r = records.pop();
      if (r) {
        const i = current.records.findIndex((x) => x.id && x.id === r.id || x.time + x.userId === r.time + r.userId);
        if (i >= 0) current.records.splice(i, 1);
        const sessions = db();
        sessions[current.code] = current;
        const q = JSON.parse(storage.getItem("trafficQueue") || "[]").filter((x) => !(x.code === current.code && x.record.id === r.id));
        if (r.id) q.push({ code: current.code, record: r, action: "delete" });
        await storage.update({ trafficSessions: JSON.stringify(sessions), trafficQueue: JSON.stringify(q) });
        flushQueue().catch((e) => {
          console.error(e);
          netStatus();
        });
      }
      showStats();
    };
    async function finishMyCounting(reason = "manual") {
      await storage.removeItem("trafficActive");
      const u2 = JSON.parse(sessionStorage.getItem("trafficUser"));
      const pending = JSON.parse(storage.getItem("trafficFinishes") || "[]");
      pending.push({ code: current.code, id: u2.id, reason });
      await storage.setItem("trafficFinishes", JSON.stringify(pending));
      await flushQueue();
      await flushFinishes();
      clearInterval(timer);
      $("sheet").classList.remove("open");
      isCreator = isCreator || storage.getItem("trafficRole:" + current.code) === "admin" && !!adminToken(current.code);
      renderUserFinal();
      $("creatorFinishActions").classList.toggle("hidden", !isCreator);
      show("finishUser");
      if (reason === "inactivity") alert("Vaše sčítání bylo po 30 minutách bez aktivity automaticky ukončeno.");
    }
    $("finish").onclick = async () => {
      vib();
      const btn = $("finish");
      if (!finishArmed) {
        finishArmed = true;
        btn.disabled = true;
        let left = 5;
        const original = "Ukončit moje sčítání";
        btn.textContent = `Potvrzení za ${left} s`;
        const cd = setInterval(() => { left--; if (left > 0) btn.textContent = `Potvrzení za ${left} s`; else { clearInterval(cd); btn.disabled = false; btn.textContent = "OPRAVDU UKONČIT"; } }, 1000);
        setTimeout(() => { if (finishArmed) { finishArmed = false; btn.disabled = false; btn.textContent = original; } }, 20000);
        return;
      }
      finishArmed = false;
      if (confirm("Opravdu ukončit vaše sčítání?")) await finishMyCounting("manual");
      else btn.textContent = "Ukončit moje sčítání";
    };
    function safeName(s2) {
      return String(s2 || "uzivatel").trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
    }
    function crc32(bytes) {
      let c = 4294967295;
      for (let b of bytes) {
        c ^= b;
        for (let k = 0; k < 8; k++) c = c >>> 1 ^ (c & 1 ? 3988292384 : 0);
      }
      return (c ^ 4294967295) >>> 0;
    }
    function u16(n) {
      return new Uint8Array([n & 255, n >>> 8 & 255]);
    }
    function u32(n) {
      return new Uint8Array([n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255]);
    }
    function catBytes(...a) {
      let n = a.reduce((x, y) => x + y.length, 0), o = new Uint8Array(n), p = 0;
      for (let x of a) {
        o.set(x, p);
        p += x.length;
      }
      return o;
    }
    function zipStore(files) {
      let enc = new TextEncoder(), locals = [], centrals = [], off = 0;
      for (let [name, data] of Object.entries(files)) {
        let nb = enc.encode(name), db2 = enc.encode(data), crc = crc32(db2), lh = catBytes(u32(67324752), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(db2.length), u32(db2.length), u16(nb.length), u16(0), nb, db2);
        locals.push(lh);
        let ch = catBytes(u32(33639248), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(db2.length), u32(db2.length), u16(nb.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), nb);
        centrals.push(ch);
        off += lh.length;
      }
      let cd = catBytes(...centrals), body = catBytes(...locals, cd), end = catBytes(u32(101010256), u16(0), u16(0), u16(centrals.length), u16(centrals.length), u32(cd.length), u32(off), u16(0));
      return new Blob([body, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    function xesc(v) {
      return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function colName(n) {
      let s2 = "";
      while (n) {
        n--;
        s2 = String.fromCharCode(65 + n % 26) + s2;
        n = Math.floor(n / 26);
      }
      return s2;
    }
    function sheetXml(rows, widths = []) {
      let rr = rows.map((row, ri) => '<row r="' + (ri + 1) + '">' + row.map((v, ci) => {
        let ref = colName(ci + 1) + (ri + 1), sty = ri === 0 ? ' s="1"' : "";
        if (typeof v === "number") return '<c r="' + ref + '"' + sty + "><v>" + v + "</v></c>";
        return '<c r="' + ref + '" t="inlineStr"' + sty + "><is><t>" + xesc(v) + "</t></is></c>";
      }).join("") + "</row>").join("");
      let cols = widths.length ? "<cols>" + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join("") + "</cols>" : "";
      let last = colName(Math.max(1, ...rows.map((r) => r.length))) + Math.max(1, rows.length);
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:' + last + '"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' + cols + "<sheetData>" + rr + '</sheetData><autoFilter ref="A1:' + last + '"/></worksheet>';
    }
    async function buildExcel(rs, name) {
      let dirs = current.directions.map((d) => d.name), summary = [["Sm\u011Br", "Pohyb / odbo\u010Den\xED", "Osobn\xED auta", "N\xE1kladn\xED auta", "Kamiony", "Autobusy", "Celkem"]];
      for (let d of current.directions) {
        let moves = d.moves.length ? d.moves : [""];
        for (let m of moves) {
          let counts = cats.map((c) => {
            let n = c.replace(/^.. /, "");
            return rs.filter((r) => r.direction === d.name && r.movement === m && r.category === n).length;
          });
          summary.push([d.name, m || "Bez rozli\u0161en\xED", ...counts, counts.reduce((a, b) => a + b, 0)]);
        }
      }
      summary.push(["CELKEM", "", ...cats.map((c) => {
        let n = c.replace(/^.. /, "");
        return rs.filter((r) => r.category === n).length;
      }), rs.length]);
      let pass = [["Datum", "\u010Cas", "Kategorie", "Sm\u011Br", "Pohyb / odbo\u010Den\xED", "Jm\xE9no u\u017Eivatele", "Stanovi\u0161t\u011B", "\u010C\xEDslo stanovi\u0161t\u011B", "Skupina", "K\xF3d s\u010D\xEDt\xE1n\xED", "Timestamp ISO", "ID z\xE1znamu", "ID s\u010D\xEDta\u010De"], ...rs.slice().sort((a, b) => a.time.localeCompare(b.time)).map((r) => {
        let d = new Date(r.time);
        return [d.toLocaleDateString("cs-CZ"), d.toLocaleTimeString("cs-CZ"), r.category, r.direction, r.movement || "", r.user, current.place, r.station || current.station, r.group || current.group, current.code, r.time, r.id || "", r.userId || ""];
      })];
      let bins = {};
      for (let r of rs) {
        let d = new Date(r.time), min = Math.floor(d.getMinutes() / 15) * 15, k = [d.toLocaleDateString("cs-CZ"), String(d.getHours()).padStart(2, "0") + ":" + String(min).padStart(2, "0"), r.direction, r.movement || "Bez rozli\u0161en\xED"].join("|");
        if (bins[k] == null) bins[k] = [0, 0, 0, 0];
        let ci = cats.findIndex((c) => c.replace(/^.. /, "") === r.category);
        if (ci >= 0) bins[k][ci]++;
      }
      let intervals = [["Datum", "Interval od", "Sm\u011Br", "Pohyb / odbo\u010Den\xED", "Osobn\xED auta", "N\xE1kladn\xED auta", "Kamiony", "Autobusy", "Celkem"], ...Object.entries(bins).sort().map(([k, v]) => [...k.split("|"), ...v, v.reduce((a, b) => a + b, 0)])];
      let users = [["Jm\xE9no", "Sm\u011Br", "\u010Cas p\u0159ipojen\xED", "\u010Cas ukon\u010Den\xED", "Doba (h)", "Sazba K\u010D/h", "Odm\u011Bna K\u010D", "Zp\u016Fsob ukon\u010Den\xED"], ...current.users.map((u2) => { const end = u2.finishedAt ? Date.parse(u2.finishedAt) : Date.now(); const hours = Math.max(0, end - Date.parse(u2.joined)) / 36e5; const rate = Number(current.hourlyRate) || 0; return [u2.name, u2.direction, new Date(u2.joined).toLocaleString("cs-CZ"), u2.finishedAt ? new Date(u2.finishedAt).toLocaleString("cs-CZ") : "Aktivn\xED", Math.round(hours * 100) / 100, rate, Math.round(hours * rate * 100) / 100, u2.finishReason || ""]; })];
      let sheets = [["Souhrn", summary, [24, 24, 15, 17, 12, 12, 12]], ["Pr\u016Fjezdy", pass, [13, 12, 20, 24, 24, 22, 24, 16, 18, 14]], ["15min intervaly", intervals, [13, 14, 24, 24, 15, 17, 12, 12, 12]], ["Pracovn\xED doba a odm\u011Bny", users, [24, 26, 22, 22, 12, 14, 16, 22]]];
      let files = { "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map((x, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") + "</Types>", "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map((x, i) => '<sheet name="' + xesc(x[0]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") + "</sheets></workbook>", "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map((x, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join("") + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>', "xl/styles.xml": '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' };
      sheets.forEach((x, i) => files["xl/worksheets/sheet" + (i + 1) + ".xml"] = sheetXml(x[1], x[2]));
      await platform2.exportFile(zipStore(files), name);
    }
    $("export").onclick = async () => {
      vib();
      let u2 = JSON.parse(sessionStorage.getItem("trafficUser") || "{}");
      await buildExcel(records, "scitani-" + safeName(current.station) + "-" + safeName(u2.name) + ".xlsx");
    };
    function renderAdminBase() {
      current = db()[current.code] || current;
      $("adminCode").textContent = current.code;
      $("adminMeta").innerHTML = `<b>${esc(current.place)}</b><div class="muted">${esc(current.station)} \xB7 ${esc(current.group)} \xB7 ${current.records.length} spole\u010Dn\xFDch z\xE1znam\u016F</div>`;
      $("adminDirs").innerHTML = current.directions.map((d) => `<div class="adminRow"><b>${esc(d.name)}</b><div>${d.moves.length ? d.moves.map((m) => `<span class="pill">${esc(m)}</span>`).join("") : '<span class="muted">Bez rozli\u0161en\xED pohyb\u016F</span>'}</div></div>`).join("");
      $("adminUsers").innerHTML = current.users.length ? current.users.map((u2) => `<div class="adminRow"><b>${esc(u2.name)}</b><div class="muted">${esc(u2.direction)} \xB7 p\u0159ipojen ${new Date(u2.joined).toLocaleTimeString("cs-CZ")} \xB7 ${u2.finishedAt ? "Dokon\u010Deno" : Date.now() - Date.parse(u2.lastSeen || u2.joined) < 12e4 ? "Aktivn\xED" : "Bez spojen\xED"} \xB7 ${((Math.max(0,(u2.finishedAt?Date.parse(u2.finishedAt):Date.now())-Date.parse(u2.joined))/36e5)).toFixed(2)} h \xB7 ${Math.round((Math.max(0,(u2.finishedAt?Date.parse(u2.finishedAt):Date.now())-Date.parse(u2.joined))/36e5)*(Number(current.hourlyRate)||0)*100)/100} K\u010D</div></div>`).join("") : '<span class="muted">Zat\xEDm se nikdo nep\u0159ipojil.</span>';
    }
    ;
    $("adminRefresh").onclick = async () => {
      vib();
      await syncCurrent();
      renderAdmin();
    };
    $("adminCount").onclick = () => {
      vib();
      openSelect();
    };
    $("adminExport").onclick = async () => {
      vib();
      await syncCurrent();
      await buildExcel(current.records, "spolecne-scitani-" + current.code + ".xlsx");
    };
    $("adminEnd").onclick = () => {
      vib();
      current = db()[current.code] || current;
      let active2 = current.users || [];
      $("endConfirmMeta").innerHTML = `<div class="adminRow"><b>${esc(current.place)}</b><div class="muted">${esc(current.station)} \xB7 ${esc(current.group)}</div></div><div class="adminRow"><b>P\u0159ipojen\xED s\u010D\xEDta\u010Di</b><div>${active2.length}</div></div><div class="adminRow"><b>Dosud zaznamen\xE1no</b><div>${current.records.length} vozidel</div></div>`;
      show("adminEndConfirm");
    };
    $("cancelAdminEnd").onclick = () => {
      vib();
      renderAdmin();
      show("admin");
    };
    $("confirmAdminEnd").onclick = async () => {
      vib();
      await storage.flush();
      await flushQueue();
      if (JSON.parse(storage.getItem("trafficQueue") || "[]").some((x) => x.code === current.code)) return alert("P\u0159ed ukon\u010Den\xEDm nejprve ode\u0161lete \u010Dekaj\xEDc\xED z\xE1znamy tohoto za\u0159\xEDzen\xED. Ov\u011B\u0159te p\u0159ipojen\xED.");
      current.ended = true;
      current.endedAt = (/* @__PURE__ */ new Date()).toISOString();
      await persist();
      let ended = IS_HOSTED ? await api("/sessions/" + current.code + "/end", { method: "POST", headers: { "X-Admin-Token": adminToken(current.code) }, body: JSON.stringify({ endedAt: current.endedAt }) }) : current;
      if (!ended) {
        current.ended = false;
        current.endedAt = null;
        await persist();
        return alert("S\u010D\xEDt\xE1n\xED se nepoda\u0159ilo ukon\u010Dit. Ov\u011B\u0159te p\u0159ipojen\xED a opr\xE1vn\u011Bn\xED spr\xE1vce.");
      }
      current = ended;
      await persist();
      if (IS_HOSTED) await syncCurrent();
      renderAdminFinal();
      show("finishAdmin");
    };
    function catCounts(rs) {
      return cats.map((c) => {
        let n = c.replace(/^.. /, "");
        return [n, rs.filter((r) => r.category === n).length];
      });
    }
    function summaryHtml(rs, personal = false) {
      let rows = catCounts(rs), total = rs.length, dirs = {};
      rs.forEach((r) => {
        let k = r.direction + (r.movement ? " \xB7 " + r.movement : "");
        dirs[k] = (dirs[k] || 0) + 1;
      });
      let u2 = JSON.parse(sessionStorage.getItem("trafficUser") || "{}");
      return `<div class="summaryBox"><div class="adminRow"><b>M\xEDsto</b><div>${esc(current.place)}</div></div><div class="adminRow"><b>Stanovi\u0161t\u011B / skupina</b><div>${esc(current.station)} \xB7 ${esc(current.group)}</div></div>${personal ? `<div class="adminRow"><b>S\u010D\xEDta\u010D</b><div>${esc(u2.name || "")}</div></div>` : ""}<h3>${personal ? "V\xE1\u0161 v\xFDsledek" : "Celkov\xFD v\xFDsledek"}</h3>${rows.map(([n, v]) => `<div class="stat"><span>${esc(n)}</span><b>${v}</b></div>`).join("")}<div class="summaryTotal">Celkem: ${total} vozidel</div><h3>Sm\u011Bry a pohyby</h3>${Object.keys(dirs).length ? Object.entries(dirs).map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><b>${v}</b></div>`).join("") : '<span class="muted">Bez zaznamenan\xFDch vozidel.</span>'}</div>`;
    }
    function renderUserFinal() {
      $("userFinal").innerHTML = summaryHtml(records, true);
    }
    function renderAdminFinal() {
      current = db()[current.code] || current;
      $("adminFinal").innerHTML = summaryHtml(current.records, false);
    }
    $("creatorToAdmin").onclick = () => {
      vib();
      renderAdmin();
      show("admin");
    };
    $("userHome").onclick = () => {
      vib();
      records = [];
      selectedDir = null;
      show("home");
    };
    $("adminHome").onclick = () => {
      vib();
      show("home");
    };
    $("finalExport").onclick = async () => {
      vib();
      await syncCurrent();
      await buildExcel(current.records, "spolecne-scitani-" + current.code + ".xlsx");
    };
    flushQueue().catch((e) => console.warn("Startup sync:", e));
    await platform2.onResume(() => {
      flushQueue().catch((e) => console.warn("Sync on resume:", e));
    });
    async function flushFinishes() {
      const pending = JSON.parse(storage.getItem("trafficFinishes") || "[]");
      for (const x of pending) {
        if (JSON.parse(storage.getItem("trafficQueue") || "[]").some((q) => q.code === x.code && q.record.userId === x.id)) continue;
        const result = await apiResult("/sessions/" + x.code + "/users/" + x.id + "/finish", { method: "POST", headers: { "X-Participant-Token": participantToken(x.code, x.id) }, body: JSON.stringify({ reason: x.reason || "manual" }) });
        if (result.ok) {
          await storage.setItem("trafficFinishes", JSON.stringify(JSON.parse(storage.getItem("trafficFinishes") || "[]").filter((y) => y.code !== x.code || y.id !== x.id)));
        }
      }
    }
    setInterval(async () => {
      await flushQueue();
      await flushFinishes();
      if (!$("count").classList.contains("hidden")) {
        const u2 = JSON.parse(sessionStorage.getItem("trafficUser") || "null");
        if (u2) {
          const idleMs = Date.now() - lastActivityAt;
          if (idleMs >= 2 * 60 * 1000) { await finishMyCounting("inactivity"); return; }
          if (idleMs >= 1 * 60 * 1000 && presencePromptFor !== lastActivityAt) {
            presencePromptFor = lastActivityAt;
            if (confirm("15 minut nebylo zaznamenáno žádné vozidlo. Jste stále na stanovišti?")) {
              const pr = await apiResult("/sessions/" + u2.code + "/users/" + u2.id + "/presence", { method: "POST", headers: { "X-Participant-Token": participantToken(u2.code, u2.id) }, body: "{}" });
              if (pr.ok) { lastActivityAt = Date.now(); presencePromptFor = 0; const a = JSON.parse(storage.getItem("trafficActive") || "null"); if (a) { a.lastActivityAt = lastActivityAt; await storage.setItem("trafficActive", JSON.stringify(a)); } }
            }
          }
          const r = await apiResult("/sessions/" + u2.code + "/users/" + u2.id + "/heartbeat", { method: "POST", headers: { "X-Participant-Token": participantToken(u2.code, u2.id) }, body: "{}" });
          if (r.ok && r.data.autoFinished) { await finishMyCounting("inactivity"); return; }
          if (r.ok && r.data.ended) {
            await storage.removeItem("trafficActive");
            clearInterval(timer);
            $("sheet").classList.remove("open");
            renderUserFinal();
            show("finishUser");
          }
        }
      }
    }, 15e3);
    const active = JSON.parse(storage.getItem("trafficActive") || "null");
    if (active) {
      const saved = db()[active.code];
      if (saved && !saved.ended) {
        const dir = saved.directions.findIndex((d) => d.name === active.direction);
        if (dir >= 0) {
          current = saved;
          selectedDir = dir;
          started = active.started;
          const mine = current.records.filter((r) => r.userId === active.id);
          lastActivityAt = active.lastActivityAt || (mine.length ? Date.parse(mine[mine.length-1].time) : active.started);
          presencePromptFor = 0;
          records = mine;
          sessionStorage.setItem("trafficUser", JSON.stringify({ id: active.id, name: active.name, code: active.code }));
          isCreator = !!adminToken(active.code);
          $("placeShow").textContent = current.place;
          $("meta").textContent = [current.station, current.group, active.name, "K\xF3d " + current.code].join(" \xB7 ");
          $("directionShow").textContent = "S\u010D\xEDt\xE1te: " + active.direction;
          renderButtons();
          show("count");
          timer = setInterval(tick, 1e3);
          tick();
        }
      }
    }
    await initAccounts({ async open(code2) {
      const r = await apiResult("/sessions/" + code2 + "/manage");
      if (!r.ok) throw Error("Ke s\u010D\xEDt\xE1n\xED nem\xE1te opr\xE1vn\u011Bn\xED.");
      current = r.data;
      isCreator = true;
      await persist();
      renderAdmin();
      show("admin");
    }, create() {
      show("setup");
    }, home() {
      show("home");
    }, busy() {
      return !$("count").classList.contains("hidden");
    } });
    function renderAdmin() {
      renderAdminBase();
      $("adminCount").classList.toggle("hidden", !!current.ended);
      $("adminEnd").classList.toggle("hidden", !!current.ended);
      let form = $("metadataForm");
      if (!form) {
        form = document.createElement("form");
        form.id = "metadataForm";
        $("adminMeta").after(form);
      }
      form.innerHTML = "<details><summary>Upravit \xFAdaje s\u010D\xEDt\xE1n\xED</summary>" + ["place", "station", "group"].map((k, i) => "<label>" + ["Lokalita", "Stanovi\u0161t\u011B", "Skupina"][i] + '<input name="' + k + '" value="' + esc(current[k]) + '" required maxlength="300"></label>').join("") + '<button class="btn secondary">Ulo\u017Eit \xFAdaje</button></details>';
      form.onsubmit = async (e) => {
        e.preventDefault();
        const r = await apiResult("/sessions/" + current.code + "/manage", { method: "PATCH", headers: { "X-Admin-Token": adminToken(current.code) }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
        if (!r.ok) return alert("\xDApravu se nepoda\u0159ilo ulo\u017Eit. Ov\u011B\u0159te p\u0159ihl\xE1\u0161en\xED a opr\xE1vn\u011Bn\xED.");
        current = r.data;
        await persist();
        renderAdmin();
      };
    }
  }

  // mobile-app-production-v1.3.0/src/main.js
  var fallback = "https://scitanidopravnihoproudu.org";
  async function boot() {
    const apiBase = /^https?:$/.test(location.protocol) ? location.origin : fallback, p = await platform(apiBase);
    p.storage = scopedStore(p.storage, "v130:" + apiBase + ":");
    window.SCITANI_API_BASE = apiBase;
    const status = document.createElement("p");
    status.className = "muted";
    status.setAttribute("role", "status");
    document.getElementById("home").append(status);
    let verifiedUntil = 0, checking;
    async function compatible() {
      if (Date.now() < verifiedUntil) return true;
      if (checking) return checking;
      checking = (async () => {
        try {
          const r = p.native ? await CapacitorHttp.request({ url: apiBase + "/health", method: "GET", responseType: "json", connectTimeout: 8e3, readTimeout: 8e3, disableRedirects: true }) : await fetch(apiBase + "/health", { cache: "no-store" });
          const d = p.native ? (typeof r.data === "string" ? JSON.parse(r.data) : r.data) : await r.json();
          const statusCode = p.native ? r.status : r.status;
          if (statusCode !== 200 || d.app !== "scitani-dopravy" || d.version !== "1.4.0") {
            status.textContent = "Nov\xE1 verze serveru je\u0161t\u011B nen\xED spu\u0161t\u011Bn\xE1. Pou\u017Eijte zat\xEDm testovac\xED aplikaci.";
            return false;
          }
          verifiedUntil = Date.now() + 6e4;
          status.textContent = "P\u0159ipojeno k serveru 1.4.0 \xB7 " + apiBase;
          return true;
        } catch (e) {
          status.textContent = "Server nen\xED dostupn\xFD. Ulo\u017Een\xE9 z\xE1znamy z\u016Fst\xE1vaj\xED v za\u0159\xEDzen\xED.";
          return false;
        }
      })();
      try {
        return await checking;
      } finally {
        checking = null;
      }
    }
    const request = p.request.bind(p);
    p.request = async (url, options = {}) => {
      if (!url.startsWith(apiBase + "/api/")) throw Error("Unexpected server address");
      if (!await compatible()) return { ok: false, status: 503, json: async () => ({ error: "server_version" }) };
      return request(url, { ...options, headers: { ...options.headers, Origin: apiBase } });
    };
    window.trafficNativeRequest = p.request;
    window.trafficArchiveExport = p.exportFile.bind(p);
    await initApp(p);
    document.getElementById("loading").hidden = true;
    document.getElementById("appContent").hidden = false;
    if (p.storage.recovered) report(Error("Byla obnovena z\xE1loha m\xEDstn\xEDch dat. Ov\u011B\u0159te posledn\xED pr\u016Fjezdy."));
  }
  function report(e) {
    const box = document.getElementById("appError");
    box.hidden = false;
    box.textContent = "Operaci se nepoda\u0159ilo dokon\u010Dit: " + ((e == null ? void 0 : e.message) || e);
  }
  window.addEventListener("unhandledrejection", (e) => {
    e.preventDefault();
    report(e.reason);
  });
  boot().catch(report);
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
