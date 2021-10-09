/**
 * @author Guojiaming
 * @description
 * 符合Promise A+ 规范的Promise工具 
 * 具体规范见: https://promisesaplus.com
 * 官方的所有测试用例已通过，具体见: https://github.com/promises-aplus/promises-tests
 */
(function (define, global) {
    define(function () {
        var STATE_REJECTED = -1;
        var STATE_PENDING = 0;
        var STATE_FULFILLED = 1;

        var nextTick = function (executor) {
            setTimeout(executor, 0);
        }

        //use process.nextTick in node
        if (global.process && typeof (global.process.nextTick) === "function") {
            nextTick = process.nextTick;
        }

        function resolvePromise(promise, x, doResolve, doReject) {
            if (promise === x) { 
                doReject(new TypeError("promise must not be the same object with x"));
                return;
            }
            if (x === null || x === undefined) {
                doResolve(x);
                return;
            }

            if (typeof (x) !== "object" && typeof (x) !== "function") {
                doResolve(x);
                return;
            }

            var then;
            try {
                then = x.then;
            } catch (e) {
                doReject(e);
                return;
            }

            if (typeof (then) !== "function") {
                doResolve(x);
                return;
            }
            var resolved = false;
            try {
                then.call(x, function (y) {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    resolvePromise(promise, y, doResolve, doReject);
                }, function (r) {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    doReject(r);
                });
            } catch (e) {
                if (!resolved) {
                    doReject(e);
                }
            }
        }

        function JPromise(executor) {
            var _state = STATE_PENDING;
            var _value = undefined;
            var _reason = undefined;
            var _fulfilledHandlers = [];
            var _rejectedHandlers = [];

            var this$ = this;

            if (typeof (executor) !== "function") {
                throw new TypeError("executor must be a function");
            }

            function doResolve(value) {
                if (_state === STATE_PENDING) {
                    _value = value;
                    _state = STATE_FULFILLED;
                    while (_fulfilledHandlers.length > 0) {
                        //onFulfilled and onRejected must be called as functions(with no this value)
                        _fulfilledHandlers.shift().call(undefined, _value);
                    }
                }
            }

            function doReject(reason) {
                if (_state === STATE_PENDING) {
                    _reason = reason;
                    _state = STATE_REJECTED;
                    while (_rejectedHandlers.length > 0) {
                        //onFulfilled and onRejected must be called as functions(with no this value)
                        _rejectedHandlers.shift().call(undefined, _reason);
                    }
                }
            }

            this.value = function(){
                return _value;
            }

            this.isFulfilled = function(){
                return _state === STATE_FULFILLED;
            }

            this.isRejected = function(){
                return _state === STATE_REJECTED;
            }

            this.isComplete = function(){
                return _state !== STATE_PENDING;
            }

            this.then = function (onFulfilled, onRejected) {
                onFulfilled = typeof (onFulfilled) === "function" ? onFulfilled : function (v) { return v };
                onRejected = typeof (onRejected) === "function" ? onRejected : function (err) { throw err };
                return new JPromise(function (resolve, reject) {
                    if (_state === STATE_FULFILLED) {
                        nextTick(function () {
                            var x = onFulfilled.call(undefined, _value);
                            resolve(x);
                        });
                    }

                    if (_state === STATE_REJECTED) {
                        nextTick(function () {
                            try {
                                var r = onRejected.call(undefined, _reason);
                                resolve(r);
                            } catch (e) {
                                reject(e);
                            }
                        })
                    }

                    if (_state === STATE_PENDING) {
                        _fulfilledHandlers.push(function (v) {
                            try {
                                var x = onFulfilled.call(undefined, v);
                                resolve(x);
                            } catch (e) {
                                reject(e);
                            }
                        });
                        _rejectedHandlers.push(function (r) {
                            try {
                                var x = onRejected.call(undefined, r);
                                resolve(x);
                            } catch (e) {
                                reject(e);
                            }
                        });
                    }
                });
            }

            this.catch = function(handler){
                this.then(undefined,handler);
            }
            //call executor
            try {
                executor.call(undefined, function (value) {
                    nextTick(function () {
                        resolvePromise(this$, value, doResolve, doReject);
                    });
                }, function (reason) {
                    nextTick(function () {
                        doReject(reason);
                    });
                });
            } catch (e) {
                doReject(e);
            }
        }

        //some helper functions

        JPromise.resolve = function (v) {
            return new JPromise(function (resolve, reject) {
                resolve(v);
            });
        }

        JPromise.reject = function (r) {
            return new JPromise(function (resolve, reject) {
                reject(r);
            });
        }

        JPromise.any = function(promiseArray){
            if(!Array.isArray(promiseArray)){
                promiseArray = arguments;
            }
            return new JPromise(function(resolve,reject){
                var resolved = false;
                var count = 0;
                for(var i = 0; i<promiseArray.length;i++){
                    var promise = promiseArray[i];
                    promise.then(function(value){
                        if(resolved)
                            return;
                        resolved = true;
                        resolve(value);
                    },function(reason){
                        if(resolved)
                            return;
                        if(count === promiseArray.length){
                            reject(new Error("AggregateError"));
                        }
                    });
                }
            });
        }

        JPromise.race = function(promiseArray){
            if(!Array.isArray(promiseArray)){
                promiseArray = arguments;
            }
            return new JPromise(function(resolve,reject){
                var resolved = false;
                for(var i = 0; i<promiseArray.length;i++){
                    var promise = promiseArray[i];
                    promise.then(function(value){
                        if(resolved)
                            return;
                        resolved = true;
                        resolve(value);
                    },function(reason){
                        if(resolved)
                            return;
                        resolved = true;
                        reject(reason);
                    });
                }
            });
        }

        JPromise.all = function(promiseArray){
            if(!Array.isArray(promiseArray)){
                promiseArray = arguments;
            }
            return new JPromise(function(resolve,reject){
                var count = 0;
                var failure = false;
                for(var i = 0; i<promiseArray.length; i++){
                    var promise = promiseArray[i];
                    promise.then(function(value){
                        count++;
                        if(!failure && count === promiseArray.length){
                            resolve();
                        }
                    },function(r){
                        if(!failure){
                            failure = true;
                            reject(r);
                        }
                    });
                }
            });
        }
        return JPromise;
    })
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(); }, this);