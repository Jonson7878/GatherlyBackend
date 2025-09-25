import Joi from "joi";

export const eventValidation = (data) => {
  const schema = Joi.object({
    eventName: Joi.string().required(),
    description: Joi.string().optional(),
    view: Joi.string().valid("public", "private").required(),
    image: Joi.string().required(),
    totalQuantity: Joi.number().integer().min(1).required(),
    dateTime: Joi.date().iso().required(),
    location: Joi.string().required(),
    tickets: Joi.array().items(
      Joi.object({
        ticketName: Joi.string().required(),
        description: Joi.string().optional(),
        price: Joi.number().min(0).required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).optional(),
  });

  return schema.validate(data);
};
