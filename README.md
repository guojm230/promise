### A custom promise implementation with [Promise A+ Specification](https://github.com/promises-aplus/promises-spec)

This implementation targets ES5, so you can use it in IE8 or other modern browsers.

JPromise can interoperate with standard Promise,such as:
``` javascript
const jpromise = new JPromise((resolve,reject)=>{
    setTimeout(()=>resolve(1),1000);
});

const promise = Promise.resolve(jpromise)

promise.then(res=>{
    console.log("value from jpromise")
    console.log(res);
})

JPromise.resolve(promise).then(res=>{
    console.log("value from promise");
    console.log(res)
});

// results:
// value from jpromise
// 1
// value from promise
// 1

```

  Benefiting from the interoperation, JPromise supports async/await operations.

  ```javascript
  async function asyncTest(){
    const a = await new JPromise((resolve,reject)=>{
        setTimeout(()=>resolve(1),1000)
    });
    console.log(a);
}

asyncTest();
console.log("async invoke");

    /**
     * result:
     *  async invoke
     *  1  
     */
  ```

> Notes:
> - Because ES5 don't support iterable object, the arguments of  all,any and race must are an array of promise-like object or any quantity of promise-like objects through var-args



