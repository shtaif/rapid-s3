const mongoose = require('mongoose');

module.exports = mongoose.model(
    'User',
    new mongoose.Schema(
        {
            name: {
                type: String,
                index: true
            }
        },
        {}
    )
);
