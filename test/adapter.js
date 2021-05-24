
const JPromise = require("../JPromise_es5");

module.exports.resolved = JPromise.resolve;
module.exports.rejected = JPromise.reject;
module.exports.deferred = function(){
    const obj = {

    }
    const promise = new JPromise((resolve,reject)=>{
        obj.resolve = resolve;
        obj.reject = reject;
    });
    obj.promise = promise;
    return obj;
}