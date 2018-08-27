const mongoose = require('mongoose');

module.exports = mongoose.model(
    'File',
    new mongoose.Schema(
        {
            userId: {
                type: String,
				index: true,
                required: true
            },
            filename: {
                type: String,
				index: true,
                required: true
            },
            size: {
                type: Number,
                required: true
            },
            accessLevel: {
                type: String,
                enum: ['public', 'private'],
                default: 'public',
                required: true
            },
			accessToken: {
				type: String,
                default: null,
				index: true
			},
            isDeleted: {
                type: Boolean,
                default: false
            },
            deletedAt: {
                type: Date,
                default: null
            },
            mimeType: {
                type: String
            }
        },
        {
            timestamps: {
                createdAt: true,
                updatedAt: true
            }
        }
    )
    .index({userId: 1, filename: 1})
);
