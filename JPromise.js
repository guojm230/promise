/**
 * 符合Promise A+ 规范的Promise工具 
 * 具体规范见: https://promisesaplus.com
 * 注意：Promise底层使用的微任务，应用层无法实现，用setTimeout模拟
 * Promise主要用于解决回调嵌套，能够把多层回调转化为链式调用，利用Promise对ajax请求进行封装，
 * 使其返回Promise对象，用法如下：
 * 封装request：
 * fun httpGet(options){
 *    return new JPromise(function(resolve,reject){
 *          doRequest(options,function (res){
 *              if(res.success){
 *                  resolve(res.data);
 *              } else 
 *                  reject(res.cause);
 *          })
 *    })
 * }
 * 
 * 使用:
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
 */

const STATE_REJECTED = -1;
const STATE_PENDING = 0;
const STATE_FULFILLED = 1;

const nextTick = (exe) => setTimeout(exe, 0);

class JPromise {
    #state = STATE_PENDING;
    #value = undefined;
    #reason = undefined;
    #fulfilledHandlers = [];
    #rejectedHandlers = [];

    constructor(executor) {
        if (typeof(executor) !== "function") {
            throw new TypeError("executor can must be a function");
        }
        try {
            executor.call(undefined, this.resolve.bind(this), this.reject.bind(this));
        } catch (e) {
            this.reject(e);
        }
    }

    resolve(value) {
        nextTick(() => {
            if (this.#state === STATE_PENDING) {
                this.#value = value;
                this.#state = STATE_FULFILLED;
                while (this.#fulfilledHandlers.length > 0) {
                    this.#fulfilledHandlers.shift().call(undefined, this.#value);
                }
            }
        });
    }

    reject(reason) {
        setTimeout(() => {
            if (this.#state === STATE_PENDING) {
                this.#reason = reason;
                this.#state = STATE_REJECTED;
                while (this.#rejectedHandlers.length > 0) {
                    this.#rejectedHandlers.shift().call(undefined, this.#reason);
                }
            }
        }, 0);
    }

    then(onFulfilled, onRejected) {
        const promise2 = new JPromise((resolve, reject) => {
            if (typeof (onFulfilled) === "function") {
                if (this.#state === STATE_PENDING) {
                    this.#fulfilledHandlers.push(v => {
                        //promise a+规范，回调函数this应为undefined，下同
                        try {
                            const x = onFulfilled.call(undefined, v);
                            //根据x的值决定promise2的状态
                            JPromise.resolvePromise(promise2, x);
                        } catch (e) {
                            reject(e);
                        }
                    })
                } else if (this.#state === STATE_FULFILLED) {
                    //回调的调用必须是异步的
                    nextTick(() => {
                        const x = onFulfilled.call(undefined, this.#value);
                        JPromise.resolvePromise(promise2, x);
                    });
                }
            } else {    //非function场景
                if (this.#state === STATE_PENDING) {
                    this.#fulfilledHandlers.push(v => {
                        resolve(v);
                    })
                }

                if (this.#state === STATE_FULFILLED) {
                    nextTick(() => resolve(this.value()));
                }
            }

            if (typeof (onRejected) === "function") {
                if (this.#state === STATE_PENDING) {
                    this.#rejectedHandlers.push(function (reason) {
                        try {
                            const x = onRejected.call(undefined, reason);
                            JPromise.resolvePromise(promise2, x);
                        } catch (e) {
                            reject(e);
                        }
                    })
                } else if (this.#state === STATE_REJECTED) {
                    nextTick(() =>{
                        const x = onRejected.call(undefined, this.#reason);
                        JPromise.resolvePromise(promise2, x);
                    });
                }
            } else {
                if (this.#state === STATE_PENDING) {
                    this.#rejectedHandlers.push(e => {
                        reject(e);
                    });
                }
                if (this.#state === STATE_REJECTED) {
                    nextTick(() => reject(this.reason()));
                }
            }
        });
        return promise2;
    }

    success(handler) {
        return this.then(handler, undefined);
    }

    catch(handler) {
        return this.then(undefined, handler);
    }

    value() {
        return this.#value;
    }

    reason() {
        return this.#reason;
    }

    state() {
        return this.#state;
    }

    static resolvePromise(promise, x) {
        if (promise === x) {  //规范定义不允许x和promise相等
            promise.reject(new TypeError("promise不能和x为同一个对象"));
            return;
        }
        if (x === null || x === undefined) {
            promise.resolve(x);
            return;
        }

        //x is also a promise
        if (JPromise.isPromise(x)) {
            x.then(result => JPromise.resolvePromise(promise,result), reason => promise.reject(reason))
            return;
        }

        if(typeof(x) !== "object" && typeof(x) !== "function"){
            promise.resolve(x);
            return;
        }

        let then;
        try {
            then = x.then;
        } catch (e) {
            promise.reject(e);
            return;
        }
    
        if (typeof (then) !== "function") {
            promise.resolve(x);
            return;
        }
        let resolved = false;
        try {
            //promise a+ 2.3.3.3 resolvePromise和rejectPromise函数
            then.call(x, y => {
                if (resolved) {
                    return;
                }
                resolved = true;
                JPromise.resolvePromise(promise, y);
            }, r => {
                if (resolved) {
                    return;
                }
                resolved = true;
                promise.reject(r);
            });
        } catch (e) {
            if (!resolved) {
                promise.reject(e);
            }
        }
    }

    static all(promiseArray) {
        return new JPromise(function (resolve, reject) {
            if (!Array.isArray(promiseArray)) {
                resolve();
                return;
            }
            let count = 0;
            let failed = false;
            promiseArray.forEach(promise => {
                if (isPromise(promise)) {
                    promise.then(() => {
                        count++;
                        if (!failed && count === promiseArray.length) {
                            resolve();
                        }
                    }, e => {
                        if (!failed) {
                            failed = true;
                            reject(e);
                        }
                    });
                }
            })
        });
    }

    static resolve(x) {
        const promise = new JPromise(() => {
            nextTick(() => JPromise.resolvePromise(promise, x));
        });
        return promise;
    }

    static reject(reason) {
        return new JPromise((resolve, reject) => {
            reject(reason);
        });
    }


    //测试一个对象是否为promise特性的对象
    static isPromise(p) {
        if (!p) {
            return false;
        }
        return p instanceof JPromise || p instanceof Promise;
    }
}

module.exports = JPromise;