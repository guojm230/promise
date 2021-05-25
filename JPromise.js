/**
 * @author 郭佳明
 * @description
 * 符合Promise A+ 规范的Promise工具 
 * 具体规范见: https://promisesaplus.com
 * 官方的所有测试用例已通过，具体见: https://github.com/promises-aplus/promises-tests
 * Promise主要用于解决回调嵌套，把多层嵌套的回调转化为链式调用，利用Promise对ajax请求进行封装，
 * 使其返回Promise对象，用法如下：
 * 封装request：
 * fun httpGet(options){
 *    return new JPromise(function(resolve,reject){
 *          doRequest(options,function (res){   //发起请求
 *              if(res.success){
 *                  resolve(res.data);
 *              } else 
 *                  reject(res.cause);
 *          })
 *    })
 * }
 * 
 * 使用:
 * 1. 回调转为链式调用
 * httpGet(options).then(function(data){
 *      do Something...
 *      return httpGet(options2);    //发起第二个请求
 * }).then(function(data){
 *      do Something
 *      return httpGet(options3);   //第三个请求
 * }).then(function(data){          //处理数据
 *      do Something
 * }).catch(function(cause){    //错误处理
 *      window.errTip(cause);
 * })
 * 
 * 2. 整合多个请求,如果有一个失败则调用catch，全部成功则调用successHandler
 * JPromise.all(httpGet(),httpGet(),httpGet(),...)
 * .then(res=>{})
 * .catch(cause=> alert(cause));
 * 
 * 
 */
(function (define, global) {
    define(function () {
        var STATE_REJECTED = -1;
        var STATE_PENDING = 0;
        var STATE_FULFILLED = 1;

        var nextTick = function (executor) {
            setTimeout(executor, 0);
        }

        //node环境下
        if (global.process && typeof (global.process.nextTick) === "function") {
            nextTick = process.nextTick;
        }

        function resolvePromise(promise, x, doResolve, doReject) {
            if (promise === x) {  //规范定义不允许x和promise相等
                doReject(new TypeError("promise不能和x为同一个对象"));
                return;
            }
            if (x === null || x === undefined) {
                doResolve(x);
                return;
            }

            //x is also a promise
            if (isPromise(x)) {
                x.then(function(result){
                    resolvePromise(promise, result, doResolve, doReject);
                }, function(reason){
                    doReject(reason);
                });
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
                //promise a+ 2.3.3.3 resolvePromise和rejectPromise函数
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

        function isPromise(p) {
            if (!p) {
                return false;
            }
            return p instanceof JPromise || p instanceof Promise;
        }

        function JPromise(executor) {
            this._state = STATE_PENDING;
            this._value = undefined;
            this._reason = undefined;
            this._fulfilledHandlers = [];
            this._rejectedHandlers = [];

            var this$ = this;

            if (typeof (executor) !== "function") {
                throw new TypeError("executor must be a function");
            }

            function doResolve(value) {
                if (this$._state === STATE_PENDING) {
                    this$._value = value;
                    this$._state = STATE_FULFILLED;
                    while (this$._fulfilledHandlers.length > 0) {
                        this$._fulfilledHandlers.shift().call(undefined, this$._value);
                    }
                }
            }

            function doReject(reason) {
                if (this$._state === STATE_PENDING) {
                    this$._reason = reason;
                    this$._state = STATE_REJECTED;
                    while (this$._rejectedHandlers.length > 0) {
                        this$._rejectedHandlers.shift().call(undefined, this$._reason);
                    }
                }
            }

            this.value = function(){
                return this$._value;
            }

            this.then = function (onFulfilled, onRejected) {
                onFulfilled = typeof (onFulfilled) === "function" ? onFulfilled : function (v) { return v };
                onRejected = typeof (onRejected) === "function" ? onRejected : function (err) { throw err };
                return new JPromise(function (resolve, reject) {
                    if (this$._state === STATE_FULFILLED) {
                        nextTick(function () {
                            var x = onFulfilled.call(undefined, this$._value);
                            resolve(x);
                        });
                    }

                    if (this$._state === STATE_REJECTED) {
                        nextTick(function () {
                            try {
                                var r = onRejected.call(undefined, this$._reason);
                                resolve(r);
                            } catch (e) {
                                reject(e);
                            }
                        })
                    }

                    if (this$._state === STATE_PENDING) {
                        this$._fulfilledHandlers.push(function (v) {
                            //promise a+规范，回调函数this应为undefined，下同
                            try {
                                var x = onFulfilled.call(undefined, v);
                                //根据x的值决定promise2的状态
                                resolve(x);
                            } catch (e) {
                                reject(e);
                            }
                        });
                        this$._rejectedHandlers.push(function (r) {
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

            try {
                executor.call(undefined, function (value) {
                    nextTick(function () {
                        resolvePromise(this$, value, doResolve.bind(this$), doReject.bind(this$));
                    });
                }, function (reason) {
                    nextTick(function () {
                        doReject.bind(this$)(reason);
                    });
                });
            } catch (e) {
                doReject(e);
            }
        }

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

        JPromise.all = function(promiseArray){
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