const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Matrimonial API",
      version: "1.0.0",
      description: "Matrimonial Backend API Documentation",
    },

    servers: [
      {
        url: "/api",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
            status: { type: "string" },
            isEmailVerified: { type: "boolean" },
            isPhoneVerified: { type: "boolean" },
            deviceToken: { type: "string" },
            deviceType: { type: "string" },
            lastLogin: { type: "string" },
            loginCount: { type: "integer" },
            lockedAt: { type: "string" },
            lockReason: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
            __v: { type: "integer" },
          },
        },

        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },

        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            statusCode: { type: "integer" },
          },
        },
      },
    },

    paths: {

      // ─────────────────────────────────────────────
      // REGISTER
      // ─────────────────────────────────────────────
      "/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["phone", "email", "password", "name"],
                  properties: {
                    phone:         { type: "string",  example: "9876543210" },
                    email:         { type: "string",  format: "email", example: "user@example.com" },
                    password:      { type: "string",  format: "password", example: "StrongPass@123" },
                    name:          { type: "string",  example: "Rahul Sharma" },
                    address:       { type: "string",  example: "123, MG Road, Indore" },
                    dob:           { type: "string",  format: "date", example: "1995-08-15" },
                    caste:         { type: "string",  example: "General" },
                    community:     { type: "string",  example: "Brahmin" },
                    subCaste:     { type: "string",  example: "Jain" },
                    gender:        { type: "string",  example: "Male" },
                    profilePhoto:  { type: "string",  example: "https://cdn.example.com/photo.jpg" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Registration successful." },
            400: { description: "Validation error or email/phone already exists." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // LOGIN
      // ─────────────────────────────────────────────
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login with email and password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email", "password"],
                  properties: {
                    email:    { type: "string", format: "email",    example: "user@example.com" },
                    password: { type: "string", format: "password", example: "StrongPass@123" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful. Sets refreshToken cookie.",
              headers: {
                "Set-Cookie": {
                  description: "refreshToken (httpOnly, secure, sameSite=strict, 30 days)",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Success" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken:  { type: "string" },
                              refreshToken: { type: "string" },
                              user:         { $ref: "#/components/schemas/User" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid credentials." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // VERIFY OTP
      // ─────────────────────────────────────────────
      // "/auth/verify-otp": {
      //   post: {
      //     tags: ["Auth"],
      //     summary: "Verify OTP sent to phone",
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "application/json": {
      //           schema: {
      //             required: ["phone", "otp"],
      //             properties: {
      //               phone: { type: "string", example: "9876543210" },
      //               otp:   { type: "string", example: "123456" },
      //               type: {
      //                 type: "string",
      //                 enum: ["registration", "forgot_password"],
      //                 default: "registration",
      //                 example: "registration",
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: {
      //         description: "OTP verified successfully. Sets refreshToken cookie if user is now verified.",
      //         headers: {
      //           "Set-Cookie": {
      //             description: "refreshToken — only set on successful verification",
      //             schema: { type: "string" },
      //           },
      //         },
      //       },
      //       400: { description: "Invalid or expired OTP." },
      //     },
      //   },
      // },

      // ─────────────────────────────────────────────
      // RESEND OTP
      // ─────────────────────────────────────────────
      // "/auth/resend-otp": {
      //   post: {
      //     tags: ["Auth"],
      //     summary: "Resend OTP to phone number",
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "application/json": {
      //           schema: {
      //             required: ["phone"],
      //             properties: {
      //               phone: { type: "string", example: "9876543210" },
      //               type: {
      //                 type: "string",
      //                 enum: ["registration", "forgot_password"],
      //                 default: "registration",
      //                 example: "registration",
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: { description: "OTP sent successfully." },
      //       404: { description: "Phone number not found." },
      //     },
      //   },
      // },

      // ─────────────────────────────────────────────
      // FORGOT PASSWORD
      // ─────────────────────────────────────────────
      "/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Send password reset link to email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Reset link sent to your email." },
            404: { description: "Email not registered." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // RESET PASSWORD
      // ─────────────────────────────────────────────
      "/auth/reset-password/{token}": {
        post: {
          tags: ["Auth"],
          summary: "Reset password using token from email link",
          parameters: [
            {
              name: "token",
              in: "path",
              required: true,
              description: "Raw reset token received in the email link",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["newPassword"],
                  properties: {
                    newPassword: { type: "string", format: "password", example: "NewPass@456" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Password reset successfully. Sets new refreshToken cookie.",
              headers: {
                "Set-Cookie": {
                  description: "refreshToken (httpOnly, secure, sameSite=strict, 30 days)",
                  schema: { type: "string" },
                },
              },
            },
            400: { description: "Invalid or expired token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // CHANGE PASSWORD
      // ─────────────────────────────────────────────
      "/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Change password (authenticated user)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string", format: "password", example: "OldPass@123" },
                    newPassword:     { type: "string", format: "password", example: "NewPass@456" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password changed successfully." },
            400: { description: "Current password is incorrect." },
            401: { description: "Unauthorized — missing or invalid token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // REFRESH TOKEN
      // ─────────────────────────────────────────────
      "/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token using refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Success" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Refresh token is required." },
            401: { description: "Invalid or expired refresh token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // LOGOUT
      // ─────────────────────────────────────────────
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout user and clear refresh token cookie",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Logged out successfully. Clears refreshToken cookie." },
            401: { description: "Unauthorized — missing or invalid token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // GET CURRENT USER
      // ─────────────────────────────────────────────
      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get currently authenticated user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "User fetched successfully.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Success" },
                      {
                        properties: {
                          data: { $ref: "#/components/schemas/User" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Unauthorized — missing or invalid token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // DELETE ACCOUNT
      // ─────────────────────────────────────────────
      "/auth/delete-account": {
        delete: {
          tags: ["Auth"],
          summary: "Permanently delete user account",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["password"],
                  properties: {
                    password: { type: "string", format: "password", example: "StrongPass@123" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Account deleted successfully. Clears refreshToken cookie." },
            400: { description: "Incorrect password." },
            401: { description: "Unauthorized — missing or invalid token." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // ADMIN LOGIN
      // ─────────────────────────────────────────────
      "/auth/admin/login": {
        post: {
          tags: ["Auth"],
          summary: "Admin login (sets adminToken cookie, 8-hour expiry)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email", "password"],
                  properties: {
                    email:    { type: "string", format: "email",    example: "admin@example.com" },
                    password: { type: "string", format: "password", example: "AdminPass@123" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Admin login successful. Sets adminToken cookie (8 hours).",
              headers: {
                "Set-Cookie": {
                  description: "adminToken (httpOnly, secure, sameSite=strict, 8 hours)",
                  schema: { type: "string" },
                },
              },
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Success" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              accessToken: { type: "string" },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            401: { description: "Invalid admin credentials or insufficient role." },
          },
        },
      },

      // ─────────────────────────────────────────────
      // CHECK PHONE
      // ─────────────────────────────────────────────
      // "/auth/check-phone": {
      //   post: {
      //     tags: ["Auth"],
      //     summary: "Check if a phone number is available for registration",
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "application/json": {
      //           schema: {
      //             required: ["phone"],
      //             properties: {
      //               phone: { type: "string", example: "9876543210" },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: {
      //         description: "Availability status returned.",
      //         content: {
      //           "application/json": {
      //             schema: {
      //               allOf: [
      //                 { $ref: "#/components/schemas/Success" },
      //                 {
      //                   properties: {
      //                     data: {
      //                       type: "object",
      //                       properties: {
      //                         available: { type: "boolean", example: true },
      //                         message:   { type: "string",  example: "Phone number is available." },
      //                       },
      //                     },
      //                   },
      //                 },
      //               ],
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // },

      // ─────────────────────────────────────────────
      // CHECK EMAIL
      // ─────────────────────────────────────────────
      "/auth/check-email": {
        post: {
          tags: ["Auth"],
          summary: "Check if an email address is available for registration",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Availability status returned.",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/Success" },
                      {
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              available: { type: "boolean", example: false },
                              message:   { type: "string",  example: "Email already registered." },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;