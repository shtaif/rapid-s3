module.exports = {
	env: process.env.APP_ENV || 'development',
	mongodbPoolSize: 6,
    defaultPort: 4443,
	storagePath: process.env.RS3_STORAGE_DIR || './storage'
};
