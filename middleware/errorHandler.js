const errorHandler = (err, req, res, next) => {
  // Log the error stack for debugging purposes
  console.error(err.stack || err);
  
  // Use the error's status code if present, otherwise default to 500
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Send the standardized error response
  res.status(statusCode).json({ error: message });
};

export default errorHandler;
