module.exports = {
	logApiErrors: process.env.RS3_LOG_API_ERRORS === 'true',
	storagePath: process.env.RS3_STORAGE_DIR || './storage',
	mongodbPoolSize: 6,
	defaultPort: 4443
};
