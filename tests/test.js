const http = require("http");

const options = {
    hostname: "localhost",
    port: 8081,
    path: "/health",
    method: "GET"
};

const request = http.request(options, (response) => {
    let data = "";

    response.on("data", chunk => {
        data += chunk;
    });

    response.on("end", () => {
        if (response.statusCode === 200) {
            console.log("TEST PASSED");
            console.log(data);
            process.exit(0);
        } else {
            console.log("TEST FAILED");
            process.exit(1);
        }
    });
});

request.on("error", error => {
    console.log("TEST FAILED");
    console.log(error.message);
    process.exit(1);
});

request.end();