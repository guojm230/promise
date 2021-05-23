
const JPromise = require("./JPromise");

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