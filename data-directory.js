const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "data");

fs.stat(dataDir, (error, stats) => {
	if (error) {
		console.log("Data directory doesn't seem to exist. Trying to create it. Error message was:");
		console.log(error);
		fs.mkdir(dataDir, error => {
			if (error) {
				console.log("Could not create data directory. Quitting. Error message was:");
				console.log(error);
				process.exit(1);
			}
		});
	} else if (!stats.isDirectory()) {
		console.log("Path to data directory is not a directory. Quitting.");
		process.exit(1);
	}
});

function getFiles() {
	return new Promise((resolve, reject) => {
		fs.readdir(dataDir, (error, items) => {
			if (error) {
				reject(error);
				return;
			}

			var promises = items.filter(item => /^[0-9]*\.json$/.test(item)).map(item => {
				return new Promise((resolve, reject) => {
					var file = path.join(dataDir, item);
					fs.stat(file, (error, stats) => {
						if (error || !stats.isFile()) {
							resolve(null);
						} else {
							resolve(item);
						}
					});
				});
			});
			Promise.all(promises).then(items => {
				resolve(items.filter(item => item != null));
			}).catch(error => {
				reject(error);
			});
		});
	});
}

class FileNotFoundError extends Error {
	constructor(message) {
		super(message);
	}
}

function getFileForId(id) {
	if (/^[0-9]*$/.test(id)) {
		return path.resolve(dataDir, id + ".json");
	} else {
		throw new FileNotFoundError("Provided id is not valid.");
	}
}

function readFile(id) {
	return new Promise((resolve, reject) => {
		try {
			fs.readFile(getFileForId(id), "utf8", (error, data) => {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			});
		} catch(error) {
			reject(error);
		}
	});
}

function deleteFile(id) {
	return new Promise((resolve, reject) => {
		try {
			fs.unlink(getFileForId(id), error => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} catch(error) {
			reject(error);
		}
	});
}

function getModificationTime(id) {
	return new Promise((resolve, reject) => {
		try {
			fs.stat(getFileForId(id), (error, stats) => {
				if (error) {
					reject(error);
				} else {
					resolve(stats.mtime);
				}
			});
		} catch(error) {
			reject(error);
		}
	});
}

function fileExists(id) {
	return new Promise((resolve, reject) => {
		try {
			fs.stat(getFileForId(id), (error, stats) => {
				if (error) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		} catch(error) {
			reject(error);
		}
	});
}

function generateId() {
	return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function getUniqueId() {
	const id = generateId();
	return fileExists(id).then(exists => {
		if (exists) {
			return getUniqueId();
		} else {
			return id;
		}
	});
}

function createNewFile(data) {
	return getUniqueId().then(id => {
		return writeToFile(id, data).then(() => {
			return id;
		});
	});
}

function writeToFile(id, data) {
	return new Promise((resolve, reject) => {
		try {
			fs.writeFile(getFileForId(id), "utf8", error => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		} catch(error) {
			reject(error);
		}
	});
}

module.exports = {
	getFiles,
	getFileForId,
	readFile,
	deleteFile,
	getModificationTime,
	writeToFile,
	createNewFile,
	FileNotFoundError
};