const adapter = require("./adapter");
const promisesAplusTests = require("promises-aplus-tests");
const JPromise = require("./JPromise");

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
    console.log("success");
});
