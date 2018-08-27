const
    fsp = require('fs').promises,
    KoaRouter = require('koa-router'),
    koaSend = require('koa-send'),
    koaMulter = require('koa-multer'),
    uniqid = require('uniqid'),
    mime = require('mime-types'),
    mongoose = require('mongoose'),
    FileModel = require('../models/file-model'),
    UserModel = require('../models/user-model'),
    { ApiError, NotPermittedApiError, NoSuchUserApiError, NoSuchFileApiError } = require('./api-errors'),
    users = require('./users'),
    config = require('../config');



const multerInstance = koaMulter({
    storage: koaMulter.diskStorage({
        destination(req, file, cb) {
            cb(null, config.storagePath);
        },
        filename(req, file, cb) {
            cb(null, `${mongoose.Types.ObjectId()}.${file.originalname.split('.').slice(1).join('.')}`);
        }
    }),

    async fileFilter(req, file, cb) {
        try {
            let existingFilename = await FileModel.findOne({
                userId: req.userId,
                filename: file.originalname,
                isDeleted: false
            });
            if (existingFilename) {
                throw new ApiError('ERR_DUPLICATE_FILENAME_FOR_USER', `Filename "${file.originalname}" already exists for user "${req.userId}"`, 400);
            }
            cb(null, true);
        }
        catch (err) {
            cb(err);
        }
    }
});


const verifyUserMiddleware = async (ctx, next) => {
    let userExists = users.find(user => user.id === ctx.params.userId);
    if (!userExists) {
        throw new NoSuchUserApiError(ctx.params.userId);
    }
    await next();
};


const filesApiRouter = new KoaRouter({prefix: '/files'})
    .get('/:userId/:filenameOrId', verifyUserMiddleware, async ctx => {
        let fileRecord;

        if (ctx.query.access_token) { // Requesting a `private` file...
            try {
                fileRecord = await FileModel.findOne({
                    userId: ctx.params.userId,
                    _id: ctx.params.filenameOrId,
                    accessToken: ctx.query.access_token,
                    accessLevel: 'private'
                });
            }
            catch (err) {
                if (err.name === 'CastError') {
                    throw new NotPermittedApiError;
                }
                throw err;
            }

            if (!fileRecord) {
                throw new NotPermittedApiError;
            }
        } else { // Requesting a `public` file...
            fileRecord = await FileModel.findOne({
                userId: ctx.params.userId,
                filename: ctx.params.filenameOrId,
                accessLevel: 'public'
            });

            if (!fileRecord) {
                throw new NoSuchFileApiError(ctx.params.filenameOrId, ctx.params.userId);
            }
        }

        if (ctx.query.metadata === 'true') { // If is a "metadata-only" request...
            ctx.body = {
                filename: fileRecord.filename,
                size: fileRecord.size,
                createdAt: fileRecord.createdAt,
                updatedAt: fileRecord.updatedAt,
                deletedAt: fileRecord.deletedAt
            };
        } else { // Otherwise, if is not marked "deleted", stream the actual file using `koa-send` based on it's stored filename got from DB...
            if (fileRecord.isDeleted) {
                throw new NoSuchFileApiError(ctx.params.filenameOrId, ctx.params.userId);
            } else {
                await koaSend(ctx, `${config.storagePath}/${fileRecord.id}.${mime.extension(fileRecord.mimeType)}`);
            }
        }
    })

    .patch('/:userId/:filenameOrId', verifyUserMiddleware, async ctx => {
        if (!ctx.request.body.accessLevel) {
            throw new ApiError('', `Missing required payload field "accessLevel"`, 400);
        }

        if (!['public', 'private'].includes(ctx.request.body.accessLevel)) {
            throw new ApiError('ERR_INVALID_PARAMS', 'Invalid `accessLevel` field value: "'+ctx.request.body.accessLevel+'"', 400);
        }

        let fileRecord;

        if (ctx.query.access_token) { // Updating an already `private` file...
            try {
                fileRecord = await FileModel.findOne({
                    _id: ctx.params.filenameOrId,
                    userId: ctx.params.userId,
                    accessToken: ctx.query.access_token,
                    accessLevel: 'private'
                });
            }
            catch (err) {
                if (err.name === 'CastError') {
                    throw new NotPermittedApiError;
                }
                throw err;
            }

            if (!fileRecord || fileRecord.isDeleted) {
                throw new NotPermittedApiError;
            }
        } else { // Updating an already `public` file...
            fileRecord = await FileModel.findOne({
                filename: ctx.params.filenameOrId,
                userId: ctx.params.userId,
                accessLevel: 'public'
            });

            if (!fileRecord) {
                throw new NoSuchFileApiError(ctx.params.filenameOrId, ctx.params.userId);
            }

            if (fileRecord.isDeleted) {
                throw new ApiError('ERR_DELETED_FILE', 'This file is marked "deleted", thus cannot be modified', 410);
            }
        }

        if (fileRecord.accessLevel !== ctx.request.body.accessLevel) {
            fileRecord.accessLevel = ctx.request.body.accessLevel;
            fileRecord.accessToken = ctx.request.body.accessLevel === 'private' ? uniqid() : null;
            await fileRecord.save();
        }

        ctx.body = {
            success: true,
            fileId: fileRecord._id,
            filename: fileRecord.filename,
            accessLevel: fileRecord.accessLevel,
            fileAccessToken: fileRecord.accessToken
        };
    })

    .post('/:userId',
        verifyUserMiddleware,

        async (ctx, next) => {
            ctx.req.userId = ctx.params.userId; // Only to make `userId` available inside the `fileFilter` of the multer instance
            await next();
        },

        multerInstance.single('file'),

        async ctx => {
            try {
                if (!ctx.req.file) {
                    throw new ApiError('ERR_NO_FILE', 'Request must be a multipart request that includes a file under the "file" field', 400);
                }

                let accessLevel = 'public';

                if (ctx.req.body.accessLevel) {
                    switch (ctx.req.body.accessLevel) {
                        case 'public':
                            accessLevel = 'public';
                            break;
                        case 'private':
                            accessLevel = 'private';
                            break;
                        default:
                            throw new ApiError('ERR_INVALID_PARAMS', 'Invalid `accessLevel` field value: "'+ctx.req.body.accessLevel+'"', 400);
                    }
                }

                let fileId = ctx.req.file.filename.split('.')[0];
                let fileAccessToken = accessLevel === 'private' ? uniqid() : null;

                let [ fileRecord ] = await Promise.all([
                    FileModel.create({
                        _id: fileId,
                        userId: ctx.params.userId,
                        filename: ctx.req.file.originalname,
                        mimeType: ctx.req.file.mimetype,
                        accessLevel,
                        accessToken: fileAccessToken,
                        size: ctx.req.file.size
                    }),

                    // Delete a file record of this user having the same filename and marked "deleted" - in case there was one
                    FileModel.remove({
                        userId: ctx.params.userId,
                        filename: ctx.req.file.originalname,
                        isDeleted: true
                    })
                ]);

                ctx.response.status = 201;
                ctx.body = {
                    success: true,
                    fileId,
                    filename: fileRecord.filename,
                    accessLevel,
                    fileAccessToken
                };
            }
            catch (err) {
                await fsp.unlink(ctx.req.file.path); // In case something failed, make sure to clear the file that might have been already saved
                throw err;
            }
        }
    )

    .delete('/:userId/:filenameOrId', verifyUserMiddleware, async ctx => {
        let fileRecord;

        if (ctx.query.access_token) { // Requesting deletion of a `private` file...
            try {
                fileRecord = await FileModel.findOne({
                    _id: ctx.params.filenameOrId,
                    userId: ctx.params.userId,
                    accessToken: ctx.query.access_token,
                    accessLevel: 'private',
                    isDeleted: false
                });
            }
            catch (err) {
                if (err.name === 'CastError') {
                    throw new NotPermittedApiError;
                } else {
                    throw err;
                }
            }

            if (!fileRecord) {
                throw new NotPermittedApiError;
            }
        } else { // Requesting deletion of a `public` file...
            fileRecord = await FileModel.findOne({
                userId: ctx.params.userId,
                filename: ctx.params.filenameOrId,
                accessLevel: 'public',
                isDeleted: false
            });

            if (!fileRecord) {
                throw new NoSuchFileApiError(ctx.params.filenameOrId, ctx.params.userId);
            }
        }

        fileRecord.isDeleted = true;
        fileRecord.deletedAt = new Date;

        await fileRecord.save();

        await fsp.unlink(`${config.storagePath}/${fileRecord.id}.${mime.extension(fileRecord.mimeType)}`);

        ctx.body = {
            success: true
        };
    });


module.exports = filesApiRouter;
