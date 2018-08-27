process.title = 'Rapid S3';

const dotenv = require('dotenv');
dotenv.config();

const
	Promise = require('bluebird'),
	fs = require('fs'),
	fsp = require('fs').promises,
	http2 = require('http2'),
	Koa = require('koa'),
	koaCompose = require('koa-compose'),
	KoaRouter = require('koa-router'),
	koaLogger = require('koa-logger'),
	koaCompress = require('koa-compress'),
	koaBodyparser = require('koa-bodyparser'),
	mongoose = require('mongoose'),
	_pick = require('lodash.pick'),
	{ magenta } = require('cli-color'),
	config = require('./config'),
	FileModel = require('./models/file-model'),
	filesApiRouter = require('./lib/files-api-router'),
	{ ApiError } = require('./lib/api-errors');



(async () => {
	try {
		// Verifiy required environment config parameters were defined
		if (!process.env.RS3_DB_URI) {
			throw new Error(
				`No MongoDB URI was configured!
				Please set it into the RS3_DB_URI environment variable.`
			);
		} else if (!process.env.RS3_TLS_KEY_PATH) {
			throw new Error(
				`No path of a TLS key was configured!
				Please set it into the RS3_TLS_KEY_PATH environment variable.`
			);
		} else if (!process.env.RS3_TLS_CERT_PATH) {
			throw new Error(
				`No path of a TLS cert was configured!
				Please set it into the RS3_TLS_CERT_PATH environment variable.`
			);
		}

		// Establish DB connection + read TLS assets to memory needed for the HTTP2 server
		const [ dbConnection, tlsKey, tlsCert ] = await Promise.all([
			mongoose.connect(process.env.RS3_DB_URI, {poolSize: config.mongodbPoolSize}),
			fsp.readFile(process.env.RS3_TLS_KEY_PATH),
			fsp.readFile(process.env.RS3_TLS_CERT_PATH),
			(async () => { // Create the root storage dir if not existed
				try {
					await fsp.mkdir(config.storagePath);
				} catch (err) {
					if (err.code !== 'EEXIST')
						throw err;
				}
			})()
		]);

		// Create a Node.js HTTP2 server and pass it a fully-middlewared Koa app
		const server = Promise.promisifyAll(
			http2.createSecureServer(
				{
					key: tlsKey,
					cert: tlsCert,
					requestCert: false,
					rejectUnauthorized: false,
					allowHTTP1: true
				},
				new Koa().use(koaCompose([
					koaLogger(),
					koaCompress(),
					koaBodyparser({enableTypes: ['json']}),

					async (ctx, next) => {
						try {
							await next();
						}
						catch (err) {
							if (config.logApiErrors) {
								console.log(err);
							}
							ctx.body = {
								success: false,
								error: null
							};
							let finalError = err instanceof ApiError ? err : new ApiError; // This empty instantiation will default to an "ERR_UNKNOWN" type of API error. It replaces the original error to avoid potentially exposing internal system information
							ctx.body.error = _pick(finalError, 'errorCode', 'message', 'thrownAt');
							ctx.response.status = finalError.statusCode;
						}
					},

					filesApiRouter.routes(),
					filesApiRouter.allowedMethods(),

					async ctx => {
						ctx.body = '404 Not Found';
						ctx.response.status = 404;
					}
				]))
				.callback()
			)
		);

		await server.listenAsync(process.env.RS3_PORT || config.defaultPort);

		console.info(magenta(`Secure HTTP2 server running on ${server.address().port}`));
	}
	catch (err) {
		console.error('App failed to start...'+"\n", err);
		process.exit(1);
	}
})();
