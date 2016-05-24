"use strict";

const http = require("http");
const express = require("express");
const logger = require("morgan");
const bodyParser = require("body-parser");
const routes = require("./routes/index");
const authenticator = require("./authenticator");
const userStore = require("./user-store");

const app = express();

app.use(logger("dev"));
app.use(bodyParser.json());

const authMiddleware = authenticator.makeMiddleware(userStore.credentialsCheck);

app.use("/", authMiddleware, routes);

// catch 404 and forward to error handler
app.use((req, res, next) => {
	const err = new Error("Not Found");
	err.status = 404;
	next(err);
});

// error handler
app.use((error, req, res, next) => {
	console.error(error);
	res.status(error.status || 500).json({message: error.message});
});


const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);
server.listen(port);
server.on("error", onError);

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

function onError(error) {
	if (error.syscall !== "listen") {
		throw error;
	}

	const bind = typeof port === "string"
		? "Pipe " + port
		: "Port " + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case "EACCES":
			console.error(bind + " requires elevated privileges");
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(bind + " is already in use");
			process.exit(1);
			break;
		default:
			throw error;
	}
}