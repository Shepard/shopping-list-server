"use strict";

const Ajv = require("ajv");
const dataDirectory = require("../data-directory");
const express = require("express");
const router = express.Router();

const schema = JSON.parse(fs.readFileSync("../shopping-list-schema.json", "utf8"));
const ajv = Ajv();
const validate = ajv.compile(schema);

router.get("/lists", (req, res, next) => {
	if (process.env.NODE_ENV != "production") {
		res.set("Access-Control-Allow-Origin", "*");
	}

	if (req.query.id) {
		// This is a request for a single list.

		if (!req.accepts("json")) {
			res.sendStatus(406);
			return;
		}

		try {
			// Don't send etag because then we'd have to support it for updating as well. :-)
			// But we only want to do that with a version number in the content.
			res.sendFile(dataDirectory.getFileForId(req.query.id), {etag: false});
		} catch(error) {
			console.error("Could not read requested list file. Error was:");
			console.error(error);
			if (error instanceof dataDirectory.FileNotFoundError) {
				res.sendStatus(404);
			} else {
				res.sendStatus(500);
			}
		}
		// dataDirectory.readFile(req.query.id).then(data => {
		// 	return dataDirectory.getModificationTime(req.query.id).then(date => {
		// 		res.set("Last-Modified", date.toUTCString());
		// 		//res.type("json").send(data);
		// 		res.json(data);
		// 	});
		// }).catch(error => {
		// 	console.error("Could not read requested list file. Error was:");
		// 	console.error(error);
		// 	if (error instanceof dataDirectory.FileNotFoundError || error.code === "ENOENT") {
		// 		res.sendStatus(404);
		// 	} else {
		// 		res.sendStatus(500);
		// 	}
		// });
	} else {
		// This is a request for all lists.

		if (!req.accepts("text/uri-list")) {
			res.sendStatus(406);
			return;
		}

		// TODO Add last-modified support for the list of lists as well?

		const requestUrl = req.protocol + "://" + req.get("host") + req.originalUrl;

		dataDirectory.getFiles().then(files => {
			res.type("text/uri-list");

			if (files.length) {
				const urls = files.map(file => requestUrl + "?id=" + file.substring(0, file.lastIndexOf(".")));
				res.send(urls.join("\r\n"));
			} else {
				res.send("# No files");
			}
		}).catch(error => {
			console.error("Could not retrieve list of all files. Error was:");
			console.error(error);
			res.sendStatus(500);
		});
	}
});

router.post("/lists", (req, res, next) => {
	if (process.env.NODE_ENV != "production") {
		res.set("Access-Control-Allow-Origin", "*");
	}

	if (!req.is("json")) {
		res.sendStatus(415);
		return;
	}

	const listPosted = req.body;

	// Validate supplied list data against schema.
	if (!validate(listPosted)) {
		res.status(400).send("Invalid: " + ajv.errorsText(validate.errors));
		return;
	}

	if (req.query.id) {
		// This is a request to update a single list.

		dataDirectory.readFile(req.query.id).then(data => {
			const listInFile = JSON.parse(data);

			// Only allow update of a list if the provided version number is exactly one higher
			// than the version number we have in the file. That way the client can't override
			// updates by others by providing a lower number and they also can't "skip" a version
			// by providing one that is too high. (The last point is not too important since the
			// client can change the data of the list in any way they want anyway.)
			if (listPosted.version !== listInFile.version + 1) {
				res.status(409);
				return dataDirectory.getModificationTime(req.query.id).then(date => {
					res.set("Last-Modified", date.toUTCString());
					res.type("json").send(data);
				});
			}

			return dataDirectory.writeToFile(req.query.id, JSON.stringify(listPosted)).then(() => {
				return dataDirectory.getModificationTime(req.query.id);
			}).then(date => {
				res.set("Last-Modified", date.toUTCString());
				res.sendStatus(204);
			});
		}).catch(error => {
			console.error("Could not read requested list file. Error was:");
			console.error(error);
			if (error instanceof dataDirectory.FileNotFoundError || error.code === "ENOENT") {
				res.sendStatus(404);
			} else {
				res.sendStatus(500);
			}
		});
	} else {
		// This is a request to create a new list.

		// The version number for new lists has to be 0.
		if (listPosted.version !== 0) {
			res.sendStatus(400);
			return;
		}

		dataDirectory.createNewFile(JSON.stringify(listPosted)).then(id => {
			return dataDirectory.getModificationTime(id).then(date => {
				res.set("Last-Modified", date.toUTCString());

				const requestUrl = req.protocol + "://" + req.get("host") + req.originalUrl;
				const location = requestUrl + "?id=" + id;
				res.set("Location", location);

				res.sendStatus(201);
			});
		}).catch(error => {
			console.error("Could not create new list file. Error was:");
			console.error(error);
			res.sendStatus(500);
		});
	}
});

router.delete("/lists", (req, res, next) => {
	if (process.env.NODE_ENV != "production") {
		res.set("Access-Control-Allow-Origin", "*");
	}

	if (req.query.id) {
		dataDirectory.deleteFile(req.query.id).then(data => {
			res.sendStatus(204);
		}).catch(error => {
			console.error("Could not delete list file. Error was:");
			console.error(error);
			if (error instanceof dataDirectory.FileNotFoundError || error.code === "ENOENT") {
				res.sendStatus(404);
			} else {
				res.sendStatus(500);
			}
		});
	} else {
		res.sendStatus(405);
	}
});

module.exports = router;