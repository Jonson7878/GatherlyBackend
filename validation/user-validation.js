import Joi from "joi";

export const validateUserRegistration = (data) => {
    const schema = Joi.object({
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().pattern(new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@#!%\\^])[A-Za-z\\d@#!%\\^]{8,16}$')).required()
            .messages({
                'string.pattern.base': "Password must be 8-16 characters long, include at least one uppercase letter, one lowercase letter, one number, and one symbol (@, #, !, %, ^)",
            }),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required()
            .messages({ 'any.only': 'Passwords do not match' }),
        companyId: Joi.string().required().messages({
                'string.empty': 'Company ID is required'
            }),
            role: Joi.string().valid("admin", "manager", "employee", "guest").optional()
    });
    return schema.validate(data);
};
