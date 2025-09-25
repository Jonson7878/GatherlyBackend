import Joi from "joi";

export const validateCompany = (data) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        description: Joi.string().optional(),
    });
    return schema.validate(data);
};
