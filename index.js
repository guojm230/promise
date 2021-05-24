const adapter = require("./test/adapter");
const promisesAplusTests = require("promises-aplus-tests");
const JPromise = require("./JPromise_es5");

let count = 0;


new Promise(()=>{}).then(()=>{
    console.log(123);
})


function yfactory(value) {
    let resolve,reject;
    const pr = new Promise((res,rej)=>{
        resolve = res;
        reject = rej;
    });
    setTimeout(()=>{
        resolve(value);
    })
    return pr;
}

function xfactory(){
    return Object.create(null, {
        then: {
            get: function () {
                ++count;
                return function thenMethodForX(onFulfilled) {
                    onFulfilled(yfactory(yfactory(yfactory("1"))));
                };
            }
        }
    });
}

new JPromise((re,rj)=>{
    setTimeout(()=>rj(1),50)
}).then(res=>{})
.catch(res=> console.log(res));



