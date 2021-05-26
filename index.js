const adapter = require("./test/adapter");
const promisesAplusTests = require("promises-aplus-tests");
const JPromise = require("./JPromise");

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


async function asyncTest(){
    const a = await new JPromise((resolve,reject)=>{
        setTimeout(()=>resolve(1),1000)
    });
    console.log(a);
}

var that = this;

const p = new Promise(function(){
    console.log(typeof(this));
    var this$ = this;
    setTimeout(function(){
        console.log(this$ === that);
    },1000);
})

console.log("async invoke");

