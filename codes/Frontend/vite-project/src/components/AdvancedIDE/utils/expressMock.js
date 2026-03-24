/**
 * Mocks the `express` package inside the browser.
 * Captures route registrations (`app.get`, `app.post`, etc) in-memory
 * and provides a method to simulate HTTP requests against them without a real backend.
 */

export default function createMockExpress() {
  const routes = {
    GET: {},
    POST: {},
    PUT: {},
    DELETE: {},
  };

  // Helper to normalize path ignoring trailing slashes (except exactly '/')
  const normalizePath = (p) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p) || "/";

  const app = {
    get: (path, handler) => { routes.GET[normalizePath(path)] = handler; },
    post: (path, handler) => { routes.POST[normalizePath(path)] = handler; },
    put: (path, handler) => { routes.PUT[normalizePath(path)] = handler; },
    delete: (path, handler) => { routes.DELETE[normalizePath(path)] = handler; },
    use: () => { console.log("[Express Mock] app.use() ignored in simulation."); },
    listen: (port, cb) => {
      console.log(`[Express Mock] Simulated server started on port ${port}`);
      if (typeof cb === 'function') cb();
    }
  };

  // The actual module.exports returned by require('express')
  const expressInstance = () => app;
  expressInstance.json = () => (req, res, next) => next(); // Stub middleware
  expressInstance.urlencoded = () => (req, res, next) => next();

  // The instance handler allowing the UI to invoke routes natively
  const simulateRequest = async (method, path, body = {}) => {
    const normalizedPath = normalizePath(path);
    const handler = routes[method.toUpperCase()]?.[normalizedPath];

    if (!handler) {
      return { status: 404, data: `Cannot ${method.toUpperCase()} ${path}` };
    }

    return new Promise((resolve) => {
      // Mock Express Request object
      const req = {
        method: method.toUpperCase(),
        path: normalizedPath,
        body: typeof body === 'string' ? JSON.parse(body || "{}") : body,
        query: {},
        params: {} // Simplified: Paramized routes (like /api/:id) require regex parsing not implemented in simple mock
      };

      let responseStatus = 200;

      // Mock Express Response object
      const res = {
        status: (code) => { responseStatus = code; return res; },
        send: (data) => resolve({ status: responseStatus, data }),
        json: (data) => resolve({ status: responseStatus, data }),
        end: () => resolve({ status: responseStatus, data: "" }),
      };

      try {
        // Execute the attached route handler. It accepts (req, res)
        handler(req, res);
      } catch (err) {
        console.error("Mock Server Crash:", err);
        resolve({ status: 500, data: "Internal Simulator Error: " + err.message });
      }
    });
  };

  return { expressApp: expressInstance, instance: { simulateRequest, routes } };
}
