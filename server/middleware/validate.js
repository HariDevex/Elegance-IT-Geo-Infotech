import logger from "../utils/logger.js";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        logger.error(`Validation failed for ${req.originalUrl}`, {
          issues: result.error.errors,
          body: req.body,
        });
        const issues = result.error.errors || result.error.issues || [];
        const details = issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details,
        });
      }
      req.validated = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
