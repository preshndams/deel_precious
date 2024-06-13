const Joi = require('joi')

const validations = {
    bestClient: {
        query: {
            schema: Joi.object({
                start: Joi.date().required(),
                end: Joi.date().required(),
                limit: Joi.number().integer().default(2)
            }),
        },
    },

    bestProfession: {
        query: {
            schema: Joi.object({
                start: Joi.date().required(),
                end: Joi.date().required(),
            }),
        },
    },

    deposit: {
        body: {
            schema: Joi.object({
                amount: Joi.number().precision(3).required()
            }),
        },
        params: {
            schema: Joi.object({
                userId: Joi.number().integer().required()
            }),
        }
    },

    pay: {
        params: {
            schema: Joi.object({
                job_id: Joi.number().integer().required()
            }),
        },
        // headers: {
        //     schema: Joi.object({
        //         profile_id: Joi.number().integer().required()
        //     }),
        // }
    },

    contract: {
        params: {
            schema: Joi.object({
                id: Joi.number().integer().required()
            }),
        },
    },
}

module.exports = validations