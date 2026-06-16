export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    // Extract all error messages and join them into a readable string
    const messages = error.details.map((detail) => detail.message);
    return res.status(400).json({ error: messages.join(', ') });
  }
  
  next();
};
