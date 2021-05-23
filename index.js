const adapter = require("./adapter");
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

const p = adapter.resolved();

// p.then(()=>{
//     return xfactory();
// }).then(res=>{
//     console.log(res);
// })

new JPromise(re=>{
    setTimeout(()=>{
        re({
            then: function(onFuilled){
                onFuilled(3);
            }
        });
    },100);
}).then(res=>console.log(res));

