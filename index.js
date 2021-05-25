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

const array = [];

const p1 = new JPromise(re=>{
    setTimeout(()=>re("1"),100);
}).then(res=> array.push(res));

const p2 = new JPromise(re=>{
    setTimeout(()=>re("2"),200)
}).then(res=>array.push(res))

const p3 = new JPromise(re=>{
    setTimeout(()=>re("3"),300)
}).then(res=>array.push(res))

const p4 = new JPromise(re=>{
    setTimeout(()=>re("4"),300)
}).then(res=>array.push(res))

const p5 = new JPromise((re,rj)=>{
    setTimeout(()=>rj("6"),500)
}).then(res=>array.push(res))

JPromise.all([p1,p2,p3,p4]).then(()=>{
    array.forEach(item=>console.log(item));
});

JPromise.all([p1,p2,p3,p4,p5]).then(()=>{
    console.log("success")
}).catch((e)=>{
    console.log("error");
    console.log(e);
})

