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

 var STATE_REJECTED = -1;
 var STATE_PENDING = 0;
 var STATE_FULFILLED = 1;
 
 function JPromise(executor) {
     this.state = STATE_PENDING;
     this.value = undefined;
     this.reason = undefined;
     //handlers，注意每个handler只允许执行一次
     this.fulfilledHandlers = [];
     this.rejectedHandlers = [];
 
     var that = this;
 
     this.resolve = function (v) {
         if (that.state === STATE_PENDING) {
             that.value = v;
             that.state = STATE_FULFILLED;
             while (that.fulfilledHandlers.length > 0) {
                 that.fulfilledHandlers.shift().call(undefined, that.value);
             }
         }
     }
 
     this.reject = function (c) {
         if (that.state === STATE_PENDING) {
             that.reason = c;
             that.state = STATE_REJECTED;
             while (that.rejectedHandlers.length > 0) {
                 that.rejectedHandlers.shift().call(undefined, that.reason);
             }
         }
     }
 
     this.then = function (onFulfilled, onRejected) {
         var promise2 = new JPromise(function (resolve, reject) {
             if (typeof (onFulfilled) === "function") {
                 if (that.state === STATE_PENDING) {
                     that.fulfilledHandlers.push(function (result) {
                         //promise a+规范，回调函数this应为undefined，下同
                         try {
                             var x = onFulfilled.call(undefined, result);
                             //根据x的值决定promise2的状态
                             resolvePromise(promise2, x);
                         } catch (e) {
                             reject(e);
                         }
                     })
                 } else if (that.state === STATE_FULFILLED) {
                     var x = onFulfilled.call(undefined, that.value);
                     resolvePromise(promise2, x);
                 }
             } else {    //非function场景
                 if (that.state === STATE_FULFILLED) {
                     resolve(onFulfilled);
                 }
             }
 
             if (typeof (onRejected) === "function") {
                 if (that.state === STATE_PENDING) {
                     that.rejectedHandlers.push(function (reason) {
                         try {
                             var x = onRejected.call(undefined, reason);
                             resolvePromise(promise2, x);
                         } catch (e) {
                             reject(e);
                         }
                     })
                 } else if (that.state === STATE_REJECTED) {
                     var x = onRejected.call(undefined, that.value);
                     resolvePromise(promise2, x);
                 }
             } else {
                 if (that.state === STATE_REJECTED) {
                     reject(onRejected);
                 }
             }
         });
         return promise2;
     }
 
     this.success = function (handler) {
         this.then(handler, undefined);
     }
 
     this.catch = function (handler) {
         this.then(undefined, handler);
     }
 
     //开始执行
     setTimeout(function () {
         try {
             executor.call(that, that.resolve, that.reject);
         } catch (e) {
             that.reject(e);
         }
     }, 0)
 }
 
 function resolvePromise(promise, x) {
     if (promise === x) {  //规范定义不允许x和promise相等
         promise.reject(new TypeError("promise不能和x为同一个对象"));
         return;
     }
     if (x === null || x === undefined) {
         promise.resolve(x);
         return;
     }
 
     //thenable对象
     if (isPromise(x)) {
         //promise状态和x保持一致
         if (x.state === STATE_PENDING) {
             x.then(function (result) {
                 promise.resolve(result);
             }, function (reason) {
                 promise.reject(reason);
             });
         }
 
         if (x.state === STATE_FULFILLED) {
             promise.resolve(x.value);
         }
         if (x.state === STATE_REJECTED) {
             promise.reject(x.reason);
         }
         return;
     }
 
     var then;
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
     var resolved = false;
     try {
         //promise a+ 2.3.3.3 resolvePromise和rejectPromise函数
         then.call(x, function (y) {
             if (resolved) {
                 return;
             }
             resolve = true;
             resolvePromise(promise, y);
         }, function (r) {
             if (resolved) {
                 return;
             }
             resolve = true;
             promise.reject(r);
         });
     } catch (e) {
         if (!resolved) {
             promise.reject(e);
         }
     }
 }
 
 //测试一个对象是否为promise特性的对象
 function isPromise(p) {
     if (!p) {
         return false;
     }
     if (typeof (p.then) === "function"
         && typeof (p.resolve) === "function"
         && typeof (p.reject) === "function") {
         return true;
     }
     return false;
 }
 
 JPromise.prototype.all = function (promiseArray) {
     return new JPromise(function (resolve, reject) {
         if (!Array.isArray(promiseArray)) {
             resolve();
             return;
         }
         var count = 0;
         var failed = false;
         for (var i = 0; i < promiseArray.length; i++) {
             var promise = promiseArray[i];
             if (isPromise(promise)) {
                 promise.then(function () {
                     count++;
                     if (!failed && count === promiseArray.length) {
                         resolve();
                     }
                 }, function (e) {
                     if (!failed) {
                         failed = true;
                         reject(e);
                     }
                 });
             } else {
                 resolve(promise);
             }
         }
     });
 }
 
 
 
 module.exports = JPromise;