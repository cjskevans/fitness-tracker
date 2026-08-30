# A basic fitness tracker

Hello, this is a basic fitness tracker website that I am building with Claude.
I am primarily building it for three reasons:

1. Frustration with current fitness tracking apps not having the features I need or those features being paywalled
2. Learn how to build with AI, such as learning best practices with AI in the modern development world
3. Learning how to self host and the security that comes along with it

Here are the primary goals
1. Self host this on Raspberry Pi or potentially in the cloud
2. Eventually actually use this website myself to track my workouts 
3. Maybe get some friends to use it
4. One day have it be an app on the Apple App Store


### Tech Stack
Front end: React with Vite  
Back end: Node with Express
Database: SQLite 3

### API Documentation
Interactive API docs are served by the backend:

- Swagger UI — http://localhost:3001/api/docs
  (also linked from the app's Settings page)
- Raw OpenAPI 3.0 spec — http://localhost:3001/api/docs.json

Every endpoint except register/login needs a JWT. Call `POST /api/auth/login`
from the docs page, copy the `token` out of the response, then hit **Authorize**
and paste it in — Swagger UI will attach it to every subsequent request.

The spec is covered by a contract test (`npm run test --prefix server`) that
fails if a route exists without documentation, so the two can't drift apart.
