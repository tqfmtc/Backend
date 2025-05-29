import Joi from 'joi';

const guestTutorSchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.min': 'Name must be at least 3 characters long',
            'string.max': 'Name cannot exceed 50 characters',
            'any.required': 'Name is required'
        }),

    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone number must be exactly 10 digits',
            'any.required': 'Phone number is required'
        }),

    qualification: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Qualification must be at least 2 characters long',
            'string.max': 'Qualification cannot exceed 100 characters',
            'any.required': 'Qualification is required'
        })
});

const dateRangeSchema = Joi.object({
    start: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'Start date must be a valid date',
            'any.required': 'Start date is required'
        }),

    end: Joi.date()
        .iso()
        .min(Joi.ref('start'))
        .required()
        .messages({
            'date.base': 'End date must be a valid date',
            'date.min': 'End date must be after or equal to start date',
            'any.required': 'End date is required'
        })
});

const guestLoginSchema = Joi.object({
    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .required(),
    
    pin: Joi.string()
        .pattern(/^[0-9]{4}$/)
        .required(),
    
    date: Joi.date()
        .iso()
        .required()
});

export const validateGuestTutor = (data) => guestTutorSchema.validate(data);
export const validateDateRange = (data) => dateRangeSchema.validate(data);
export const validateGuestLogin = (data) => guestLoginSchema.validate(data);
