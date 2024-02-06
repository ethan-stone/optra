// function outer() {
//   var a = 10;
//   function inner() {
//     console.log(a);
//     var a = 20;
//   }

//   return inner;
// }

// const myFunc = outer();
// myFunc();

// const fetchData = async (url) => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       if (url.includes("valid")) {
//         resolve("Fetched data from url");
//       } else {
//         reject(new Error("Failed to fetch"));
//       }
//     }, 1000);
//   });
// };

// const urls = [
//   "https://valid.example.com/1",
//   "https://invalid.example.com",
//   "https://valid.example.com/2",
// ];

// Promise.allSettled(
//   urls.map((url) =>
//     fetchData(url).catch((err) => {
//       throw new Error(err.message);
//     })
//   )
// )
//   .then((results) => {
//     const outputs = results.map((result, index) => {
//       if (result.status === "fulfilled") {
//         return `success: ${result.value}`;
//       } else {
//         return `error: ${result.reason.message}`;
//       }
//     });

//     console.log(outputs);
//   })
//   .catch((error) => console.error("unexpected error: ", error.message));

console.log("start");

setTimeout(() => console.log("setTimeout 1"), 0);
setTimeout(() => console.log("setTimeout 2"), 0);

Promise.resolve().then(() => console.log("promise 1"));
Promise.resolve().then(() => console.log("promise 2"));

console.log("end");
