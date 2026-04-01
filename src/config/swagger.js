const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Matrimonial API",
      version: "1.0.0",
      description: "Matrimonial Backend API Documentation",
    },
    servers: [{ url: "/api" }],
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
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
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
      // ═══════════════════════════════════════════════
      // AUTH ROUTES
      // ═══════════════════════════════════════════════

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
                    phone: { type: "string", example: "9876543210" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "user@example.com",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "StrongPass@123",
                    },
                    name: { type: "string", example: "Rahul Sharma" },
                    address: {
                      type: "string",
                      example: "123, MG Road, Indore",
                    },
                    dob: {
                      type: "string",
                      format: "date",
                      example: "1995-08-15",
                    },
                    caste: { type: "string", example: "General" },
                    community: { type: "string", example: "Brahmin" },
                    subCaste: { type: "string", example: "Jain" },
                    gender: { type: "string", example: "male" },
                    profilePhoto: {
                      type: "string",
                      example: "https://cdn.example.com/photo.jpg",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Registration successful." },
            400: {
              description: "Validation error or email/phone already exists.",
            },
          },
        },
      },

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
                    email: {
                      type: "string",
                      format: "email",
                      example: "user@example.com",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "StrongPass@123",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful. Sets refreshToken cookie." },
            401: { description: "Invalid credentials." },
          },
        },
      },

      "/auth/check-availability": {
        post: {
          tags: ["Auth"],
          summary: "Check phone/email availability (one or both)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    phone: { type: "string", example: "9876543210" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "user@example.com",
                    },
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
                              phone: {
                                type: "object",
                                properties: {
                                  available: { type: "boolean", example: true },
                                  message: {
                                    type: "string",
                                    example: "Phone number is available.",
                                  },
                                },
                              },
                              email: {
                                type: "object",
                                properties: {
                                  available: {
                                    type: "boolean",
                                    example: false,
                                  },
                                  message: {
                                    type: "string",
                                    example: "Email already registered.",
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            400: { description: "Phone or email is required." },
          },
        },
      },

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
                    email: {
                      type: "string",
                      format: "email",
                      example: "user@example.com",
                    },
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

      "/auth/reset-password/{token}": {
        post: {
          tags: ["Auth"],
          summary: "Reset password using token from email link",
          parameters: [
            {
              name: "token",
              in: "path",
              required: true,
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
                    newPassword: {
                      type: "string",
                      format: "password",
                      example: "NewPass@456",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password reset successfully." },
            400: { description: "Invalid or expired token." },
          },
        },
      },

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
                    currentPassword: {
                      type: "string",
                      format: "password",
                      example: "OldPass@123",
                    },
                    newPassword: {
                      type: "string",
                      format: "password",
                      example: "NewPass@456",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password changed successfully." },
            401: { description: "Unauthorized." },
          },
        },
      },

      "/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string", example: "eyJhbGci..." },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Token refreshed successfully." },
            401: { description: "Invalid or expired refresh token." },
          },
        },
      },

      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Logged out successfully." },
            401: { description: "Unauthorized." },
          },
        },
      },

      "/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get currently authenticated user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "User fetched successfully." },
            401: { description: "Unauthorized." },
          },
        },
      },

      "/auth/delete-account": {
        delete: {
          tags: ["Auth"],
          summary: "Delete user account",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["password"],
                  properties: {
                    password: {
                      type: "string",
                      format: "password",
                      example: "StrongPass@123",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Account deleted successfully." },
            401: { description: "Unauthorized or wrong password." },
          },
        },
      },

      "/auth/admin/login": {
        post: {
          tags: ["Auth"],
          summary: "Admin login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["email", "password"],
                  properties: {
                    email: {
                      type: "string",
                      format: "email",
                      example: "admin@example.com",
                    },
                    password: {
                      type: "string",
                      format: "password",
                      example: "AdminPass@123",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Admin login successful." },
            401: { description: "Invalid credentials or insufficient role." },
          },
        },
      },

      // ═══════════════════════════════════════════════
      // PROFILE ROUTES
      // ═══════════════════════════════════════════════

      "/profile": {
        put: {
          tags: ["Profile"],
          summary: "Edit profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  properties: {
                    basicInfo: { type: "object" },
                    astroDetails: { type: "object" },
                    physicalDetails: { type: "object" },
                    education: { type: "object" },
                    career: { type: "object" },
                    familyDetails: { type: "object" },
                    address: { type: "object" },
                    lifestyle: { type: "object" },
                    aboutMe: {
                      type: "string",
                      example: "I am a software engineer...",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile saved successfully." },
            401: { description: "Unauthorized." },
          },
        },
        get: {
          tags: ["Profile"],
          summary: "Get my profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Profile fetched successfully." },
            404: { description: "Profile not found." },
          },
        },
      }, 

      // "/profile/{id}": {
      //   get: {
      //     tags: ["Profile"],
      //     summary: "Get profile by ID (also records a view)",
      //     security: [{ bearerAuth: [] }],
      //     parameters: [
      //       {
      //         name: "id",
      //         in: "path",
      //         required: true,
      //         schema: { type: "string" },
      //         description: "Profile ID",
      //       },
      //     ],
      //     responses: {
      //       200: { description: "Profile fetched successfully." },
      //       404: { description: "Profile not found." },
      //     },
      //   },
      // },

      // "/profile/section/{section}": {
      //   patch: {
      //     tags: ["Profile"],
      //     summary: "Update a specific profile section",
      //     security: [{ bearerAuth: [] }],
      //     parameters: [
      //       {
      //         name: "section",
      //         in: "path",
      //         required: true,
      //         schema: {
      //           type: "string",
      //           enum: [
      //             "basicInfo",
      //             "astroDetails",
      //             "physicalDetails",
      //             "education",
      //             "career",
      //             "familyDetails",
      //             "address",
      //             "lifestyle",
      //             "aboutMe",
      //           ],
      //         },
      //       },
      //     ],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "application/json": {
      //           schema: { type: "object" },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: { description: "Section updated successfully." },
      //       401: { description: "Unauthorized." },
      //     },
      //   },
      // },

      // "/profile/photos": {
      //   post: {
      //     tags: ["Profile"],
      //     summary: "Upload single photo",
      //     security: [{ bearerAuth: [] }],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "multipart/form-data": {
      //           // ✅ yahi hona chahiye
      //           schema: {
      //             type: "object",
      //             required: ["photo"],
      //             properties: {
      //               photo: {
      //                 type: "string",
      //                 format: "binary", // ✅ yeh line file picker deta hai
      //               },
      //               isProfilePicture: {
      //                 type: "string",
      //                 enum: ["true", "false"],
      //                 default: "false",
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: { description: "Photo uploaded successfully." },
      //       400: { description: "No file uploaded." },
      //       401: { description: "Unauthorized." },
      //     },
      //   },
      // },
      // "/profile/photos/multiple": {
      //   post: {
      //     tags: ["Profile"],
      //     summary: "Upload multiple photos (max 10)",
      //     security: [{ bearerAuth: [] }],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "multipart/form-data": {
      //           schema: {
      //             type: "object",
      //             required: ["photos"],
      //             properties: {
      //               photos: {
      //                 type: "array",
      //                 items: {
      //                   type: "string",
      //                   format: "binary", // ✅ file picker ke liye
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: { description: "Photos uploaded successfully." },
      //       400: { description: "No files uploaded or max 10 limit exceeded." },
      //       401: { description: "Unauthorized." },
      //     },
      //   },
      // },

      // "/profile/photos/{photoId}": {
      //   delete: {
      //     tags: ["Profile"],
      //     summary: "Delete a photo",
      //     security: [{ bearerAuth: [] }],
      //     parameters: [
      //       {
      //         name: "photoId",
      //         in: "path",
      //         required: true,
      //         description: "Photo ID (MongoDB _id from photos array)",
      //         schema: { type: "string", example: "64abc123def456" },
      //       },
      //     ],
      //     responses: {
      //       200: { description: "Photo deleted successfully." },
      //       404: { description: "Photo not found." },
      //       401: { description: "Unauthorized." },
      //     },
      //   },
      // },

      // "/profile/photos/{photoId}/profile-picture": {
      //   patch: {
      //     tags: ["Profile"],
      //     summary: "Set a photo as profile picture",
      //     security: [{ bearerAuth: [] }],
      //     parameters: [
      //       {
      //         name: "photoId",
      //         in: "path",
      //         required: true,
      //         description: "Photo ID jo profile picture banana hai",
      //         schema: { type: "string", example: "64abc123def456" },
      //       },
      //     ],
      //     responses: {
      //       200: {
      //         description: "Profile picture updated successfully.",
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
      //                         photos: {
      //                           type: "array",
      //                           items: {
      //                             type: "object",
      //                             properties: {
      //                               _id: { type: "string" },
      //                               url: { type: "string" },
      //                               isProfilePicture: { type: "boolean" },
      //                               isVerified: { type: "boolean" },
      //                             },
      //                           },
      //                         },
      //                       },
      //                     },
      //                   },
      //                 },
      //               ],
      //             },
      //           },
      //         },
      //       },
      //       404: { description: "Photo not found." },
      //       401: { description: "Unauthorized." },
      //     },
      //   },
      // },



      "/profile/search": {
        get: {
          tags: ["Profile"],
          summary: "Search profiles with filters",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "gender", in: "query", schema: { type: "string" } },
            { name: "religion", in: "query", schema: { type: "string" } },
            { name: "caste", in: "query", schema: { type: "string" } },
            { name: "education", in: "query", schema: { type: "string" } },
            { name: "occupation", in: "query", schema: { type: "string" } },
            { name: "state", in: "query", schema: { type: "string" } },
            { name: "city", in: "query", schema: { type: "string" } },
            { name: "maritalStatus", in: "query", schema: { type: "string" } },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", example: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", example: 20 },
            },
          ],
          responses: {
            200: { description: "Search results fetched successfully." },
          },
        },
      },

      // "/profile/stats": {
      //   get: {
      //     tags: ["Profile"],
      //     summary: "Get profile statistics",
      //     security: [{ bearerAuth: [] }],
      //     responses: {
      //       200: { description: "Profile statistics fetched successfully." },
      //     },
      //   },
      // },

      "/profile/completion": {
        get: {
          tags: ["Profile"],
          summary: "Get profile completion percentage and section-wise status",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Profile completion status fetched successfully.",
            },
          },
        },
      },

      // "/profile/privacy": {
      //   patch: {
      //     tags: ["Profile"],
      //     summary: "Update privacy settings",
      //     security: [{ bearerAuth: [] }],
      //     requestBody: {
      //       required: true,
      //       content: {
      //         "application/json": {
      //           schema: {
      //             properties: {
      //               showPhone: { type: "boolean", example: false },
      //               showEmail: { type: "boolean", example: false },
      //               showAge: { type: "boolean", example: true },
      //             },
      //           },
      //         },
      //       },
      //     },
      //     responses: {
      //       200: { description: "Privacy settings updated successfully." },
      //     },
      //   },
      // },

      // "/profile/deactivate": {
      //   post: {
      //     tags: ["Profile"],
      //     summary: "Deactivate profile (hide from search)",
      //     security: [{ bearerAuth: [] }],
      //     responses: {
      //       200: { description: "Profile deactivated successfully." },
      //     },
      //   },
      // },

      // "/profile/activate": {
      //   post: {
      //     tags: ["Profile"],
      //     summary: "Activate profile (show in search)",
      //     security: [{ bearerAuth: [] }],
      //     responses: {
      //       200: { description: "Profile activated successfully." },
      //     },
      //   },
      // },

      // ═══════════════════════════════════════════════
      // MATCH ROUTES
      // ═══════════════════════════════════════════════

      "/matches/suggestions": {
        get: {
          tags: ["Matches"],
          summary: "Get AI-based match suggestions",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", example: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", example: 20 },
            },
          ],
          responses: {
            200: { description: "Match suggestions fetched successfully." },
          },
        },
      },

      "/matches/daily": {
        get: {
          tags: ["Matches"],
          summary: "Get today's daily matches",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Daily matches fetched successfully." },
          },
        },
      },

      "/matches/mutual": {
        get: {
          tags: ["Matches"],
          summary: "Get mutual matches (both sent interest)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Mutual matches fetched successfully." },
          },
        },
      },

      "/matches/nearby": {
        get: {
          tags: ["Matches"],
          summary: "Get nearby profiles by radius",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "radius",
              in: "query",
              schema: { type: "integer", example: 100 },
              description: "Radius in km (default: 100)",
            },
          ],
          responses: {
            200: { description: "Nearby profiles fetched successfully." },
          },
        },
      },

      "/matches/recently-viewed": {
        get: {
          tags: ["Matches"],
          summary: "Get recently viewed profiles",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Recently viewed profiles fetched successfully.",
            },
          },
        },
      },

      "/matches/visitors": {
        get: {
          tags: ["Matches"],
          summary: "Get users who viewed your profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Profile visitors fetched successfully." },
          },
        },
      },

      // ═══════════════════════════════════════════════
      // INTEREST ROUTES
      // ═══════════════════════════════════════════════

      "/interests/send": {
        post: {
          tags: ["Interests"],
          summary: "Send interest to a profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["receiverId"],
                  properties: {
                    receiverId: { type: "string", example: "64abc123..." },
                    message: {
                      type: "string",
                      example: "I liked your profile.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Interest sent successfully." },
            400: { description: "Already sent or blocked." },
          },
        },
      },

      "/interests/{interestId}/accept": {
        post: {
          tags: ["Interests"],
          summary: "Accept a received interest",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "interestId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Interest accepted successfully." },
            404: { description: "Interest not found." },
          },
        },
      },

      "/interests/{interestId}/reject": {
        post: {
          tags: ["Interests"],
          summary: "Reject a received interest",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "interestId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  properties: {
                    reason: { type: "string", example: "Not compatible." },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Interest rejected." },
          },
        },
      },

      "/interests/{interestId}/cancel": {
        delete: {
          tags: ["Interests"],
          summary: "Cancel a sent interest",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "interestId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Interest cancelled successfully." },
          },
        },
      },

      "/interests/received": {
        get: {
          tags: ["Interests"],
          summary: "Get received interests",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["PENDING", "ACCEPTED", "REJECTED"],
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", example: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", example: 20 },
            },
          ],
          responses: {
            200: { description: "Received interests fetched successfully." },
          },
        },
      },

      "/interests/sent": {
        get: {
          tags: ["Interests"],
          summary: "Get sent interests",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["PENDING", "ACCEPTED", "REJECTED"],
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", example: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", example: 20 },
            },
          ],
          responses: {
            200: { description: "Sent interests fetched successfully." },
          },
        },
      },

      "/interests/stats": {
        get: {
          tags: ["Interests"],
          summary: "Get interest statistics",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Interest statistics fetched successfully." },
          },
        },
      },

      "/interests/mutual": {
        get: {
          tags: ["Interests"],
          summary: "Get mutual interests",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "Mutual interests fetched successfully." },
          },
        },
      },

      "/interests/bulk-send": {
        post: {
          tags: ["Interests"],
          summary: "Send interest to multiple profiles at once",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  required: ["receiverIds"],
                  properties: {
                    receiverIds: {
                      type: "array",
                      items: { type: "string" },
                      example: ["64abc1...", "64abc2..."],
                    },
                    message: {
                      type: "string",
                      example: "Interested in your profile.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Bulk interest operation completed." },
            400: { description: "receiverIds must be a non-empty array." },
          },
        },
      },

      "/interests/shortlist/{profileId}": {
        post: {
          tags: ["Interests"],
          summary: "Shortlist or un-shortlist a profile (toggle)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "profileId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Shortlist toggled successfully." },
          },
        },
      },

      "/interests/shortlisted": {
        get: {
          tags: ["Interests"],
          summary: "Get all shortlisted profiles",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", example: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", example: 20 },
            },
          ],
          responses: {
            200: { description: "Shortlisted profiles fetched successfully." },
          },
        },
      },
    },
  },

  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
