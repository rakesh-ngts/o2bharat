/**
 * Standard API Response class for consistent response formatting
 */
class ApiResponse {
  /**
   * Success Response
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      statusCode,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Created Response (201)
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No Content Response (204)
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated Response
   */
  static paginated(res, data, page, limit, total, message = 'Success') {
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
      success: true,
      message,
      statusCode: 200,
      data,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Error Response
   */
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      statusCode,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Bad Request Response (400)
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized Response (401)
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden Response (403)
   */
  static forbidden(res, message = 'Forbidden access') {
    return this.error(res, message, 403);
  }

  /**
   * Not Found Response (404)
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }
}

module.exports = ApiResponse;