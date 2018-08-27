// Root Api Error type:
class ApiError extends Error {
    constructor() {
        super();

        this.errorCode = 'ERR_UNKNOWN';
        this.message = 'Some unknown error occured!';
		this.statusCode = 500;
        this.thrownAt = new Date().toISOString();

        if (arguments[0] instanceof Object) {
            Object.assign(this, arguments[0]);
        } else {
            if (arguments[0])
                this.errorCode = arguments[0];
            if (arguments[1])
                this.message = arguments[1];
            if (arguments[2])
                this.statusCode = arguments[2];
        }

		Error.captureStackTrace(this, this.constructor);
    }
}


// Common predefined Api Error types:
class NotPermittedApiError extends ApiError {
	constructor() {
		super({
			errorCode: 'ERR_NOT_PERMITTED',
	        message: 'Not permitted to perform this action',
			statusCode: 403
		});
	}
}
class NoSuchUserApiError extends ApiError {
	constructor(userId) {
		super({
			errorCode: 'ERR_NO_SUCH_USER',
			message: `No such user with ID "${userId}"`,
			statusCode: 404
		});
	}
}
class NoSuchFileApiError extends ApiError {
	constructor(filename, userId) {
		super({
			errorCode: 'ERR_NO_SUCH_FILE',
	        message: `No such file "${filename}" for user "${userId}"`,
			statusCode: 404
		});
	}
}


module.exports.ApiError = ApiError;
module.exports.NotPermittedApiError = NotPermittedApiError;
module.exports.NoSuchUserApiError = NoSuchUserApiError;
module.exports.NoSuchFileApiError = NoSuchFileApiError;
