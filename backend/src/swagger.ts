import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Daily Productivity API',
      version: '1.0.0',
      description: 'API for the Daily productivity tracking system',
    },
    servers: [{ url: 'https://backenddaily.ashishserver.space/api-docs', description: 'Production' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'User created, returns token' },
            '400': { description: 'Validation error' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Returns JWT token' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/profile': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          responses: {
            '200': { description: 'User profile' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'Get all tasks',
          responses: { '200': { description: 'List of tasks' } },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create a task',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Task created' } },
        },
      },
      '/api/tasks/{id}': {
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Task deleted' }, '404': { description: 'Not found' } },
        },
      },
      '/api/tasks/{id}/complete': {
        post: {
          tags: ['Tasks'],
          summary: 'Log task completion',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Completion logged' } },
        },
      },
      '/api/tasks/completions/today': {
        get: {
          tags: ['Tasks'],
          summary: "Get today's task completions",
          responses: { '200': { description: 'Completions list' } },
        },
      },
      '/api/timer/start': {
        post: {
          tags: ['Timer'],
          summary: 'Start a timer session',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { type: { type: 'string', enum: ['work', 'break'] } },
                },
              },
            },
          },
          responses: { '200': { description: 'Timer started' } },
        },
      },
      '/api/timer/pause': {
        post: { tags: ['Timer'], summary: 'Pause active timer', responses: { '200': { description: 'Timer paused' } } },
      },
      '/api/timer/stop': {
        post: { tags: ['Timer'], summary: 'Stop active timer', responses: { '200': { description: 'Timer stopped' } } },
      },
      '/api/timer/active': {
        get: { tags: ['Timer'], summary: 'Get active timer session', responses: { '200': { description: 'Active session or null' } } },
      },
      '/api/timer/today': {
        get: { tags: ['Timer'], summary: "Get today's timer sessions", responses: { '200': { description: 'Sessions list' } } },
      },
      '/api/dashboard/daily': {
        get: { tags: ['Dashboard'], summary: 'Daily dashboard data', responses: { '200': { description: 'Daily stats' } } },
      },
      '/api/dashboard/weekly': {
        get: { tags: ['Dashboard'], summary: 'Weekly dashboard data', responses: { '200': { description: 'Weekly stats' } } },
      },
      '/api/dashboard/monthly': {
        get: { tags: ['Dashboard'], summary: 'Monthly dashboard data', responses: { '200': { description: 'Monthly stats' } } },
      },
      '/api/dashboard/yearly': {
        get: { tags: ['Dashboard'], summary: 'Yearly dashboard data', responses: { '200': { description: 'Yearly stats' } } },
      },
      '/api/goals': {
        get: { tags: ['Goals'], summary: 'Get all goals', responses: { '200': { description: 'Goals list' } } },
        post: {
          tags: ['Goals'],
          summary: 'Create a goal',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'targetHours', 'endDate'],
                  properties: {
                    title: { type: 'string' },
                    targetHours: { type: 'number' },
                    endDate: { type: 'string', format: 'date' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Goal created' } },
        },
      },
      '/api/goals/{id}/progress': {
        patch: {
          tags: ['Goals'],
          summary: 'Update goal progress',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { achievedHours: { type: 'number' } } },
              },
            },
          },
          responses: { '200': { description: 'Progress updated' } },
        },
      },
      '/api/mobile-usage/sync': {
        post: {
          tags: ['Mobile Usage'],
          summary: 'Sync mobile usage data',
          security: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date' },
                    appUsage: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Data synced' } },
        },
      },
      '/api/mobile-usage/today': {
        get: { tags: ['Mobile Usage'], summary: "Get today's mobile usage", responses: { '200': { description: 'Usage data' } } },
      },
    },
  },
  apis: [],
}

export const swaggerSpec = swaggerJsdoc(options)
