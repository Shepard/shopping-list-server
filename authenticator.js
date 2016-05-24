"use strict";

var basicAuth = require("basic-auth");

function auth(credentialsCheck, req, res, next) {
	function unauthorized(res) {
		res.set("WWW-Authenticate", "Basic realm=Authorization Required");
		return res.sendStatus(401);
	}

	var user = basicAuth(req);

	if (!user || !user.name || !user.pass) {
		return unauthorized(res);
	}

	if (credentialsCheck(user.name, user.pass)) {
		req.username = user.name;
		return next();
	} else {
		return unauthorized(res);
	}
}

function makeMiddleware(credentialsCheck) {
	return auth.bind(null, credentialsCheck);
}

module.exports = {
	auth,
	makeMiddleware
};