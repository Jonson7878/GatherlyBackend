import Joi from "joi";
import mongoose from "mongoose";


const objectId = (value, helpers) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
    }
    return value;
};

export const taskValidation = Joi.object({
    taskName: Joi.string().required(),
    description: Joi.string().optional(),
    assignBy: Joi.string().custom(objectId).required(),
    assignTo: Joi.string().custom(objectId).required(),
    priority: Joi.string().valid("high", "medium", "low", "critical").required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required().messages({
        "date.greater": "End date must be after the start date."
    }),
});
