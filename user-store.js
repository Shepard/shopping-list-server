"use strict";

const fs = require("fs");

const userFile = process.env.USER_FILE || "data/users";
const store = new Map(fs.readFileSync(userFile, "utf8").split("\n").map(line => line.trim().split(":")));

function credentialsCheck(username, password) {
	const storedPassword = store.get(username);
	return typeof storedPassword !== "undefined" && storedPassword === password;
}

module.exports = {
	credentialsCheck
};