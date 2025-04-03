import Joi from 'joi';

// Base bundle schema
export const bundleSchema = Joi.object({
  title: Joi.string().required().min(3).max(100)
    .messages({
      'string.empty': 'Bundle title is required',
      'string.min': 'Title must be at least {#limit} characters',
      'string.max': 'Title cannot exceed {#limit} characters'
    }),
  price: Joi.number().required().positive().precision(2)
    .messages({
      'number.base': 'Valid price is required',
      'number.positive': 'Price must be positive',
      'number.precision': 'Price can have max 2 decimal places'
    }),
  description: Joi.string().max(500)
    .messages({
      'string.max': 'Description cannot exceed {#limit} characters'
    }),
  categories: Joi.array().items(Joi.string()).min(1).max(5).required()
    .messages({
      'array.min': 'At least one category is required',
      'array.max': 'Cannot have more than {#limit} categories'
    }),
  BundleData: Joi.array().items(
    Joi.object({
      productIndex: Joi.number().required(),
      colors: Joi.array().items(
        Joi.object({
          color: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
            .message('Invalid color hex code'),
          sizes: Joi.array().items(Joi.string()).min(1).max(10).required()
            .messages({
              'array.min': 'At least one size is required',
              'array.max': 'Cannot have more than {#limit} sizes'
            })
        })
      ).min(1).message('At least one color variant is required')
    })
  ).min(1).message('At least one product is required')
});

// Update bundle schema (less strict)
export const updateBundleSchema = bundleSchema.fork(
  ['title', 'price', 'categories', 'BundleData'],
  schema => schema.optional()
);

// Query parameters schema
export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('price', 'createdAt', 'updatedAt', 'title'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  search: Joi.string().max(100),
  category: Joi.string()
});