# 5eTools REST API

A REST API for accessing Dungeons & Dragons 5e reference data from the 5eTools project.

## Getting Started

### Installation

Install dependencies:
```bash
npm install
```

### Running the API Server

Start the API server:
```bash
npm run serve:api
```

For development with auto-reload:
```bash
npm run serve:api:dev
```

The API will be available at `http://localhost:3000`

## API Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

This Swagger UI interface allows you to explore and test all available endpoints.

## Available Endpoints

### Spells
- `GET /api/spells` - Get all spells with optional filters
  - Query parameters: `level`, `school`, `source`, `search`
- `GET /api/spells/{name}` - Get a specific spell

### Classes
- `GET /api/classes` - Get all classes
  - Query parameters: `source`
- `GET /api/classes/{name}` - Get a specific class

### Races
- `GET /api/races` - Get all races
  - Query parameters: `source`
- `GET /api/races/{name}` - Get a specific race

### Items
- `GET /api/items` - Get all items
  - Query parameters: `rarity`, `type`
- `GET /api/items/{name}` - Get a specific item

### Monsters
- `GET /api/monsters` - Get all monsters
  - Query parameters: `cr` (Challenge Rating), `type`, `source`
- `GET /api/monsters/{name}` - Get a specific monster

### Feats
- `GET /api/feats` - Get all feats
  - Query parameters: `source`
- `GET /api/feats/{name}` - Get a specific feat

### Backgrounds
- `GET /api/backgrounds` - Get all backgrounds
- `GET /api/backgrounds/{name}` - Get a specific background

### Actions
- `GET /api/actions` - Get all actions
- `GET /api/actions/{name}` - Get a specific action

## Example Requests

### Get all spells
```bash
curl http://localhost:3000/api/spells
```

### Get spells filtered by level
```bash
curl "http://localhost:3000/api/spells?level=3"
```

### Search for a spell
```bash
curl "http://localhost:3000/api/spells?search=fireball"
```

### Get a specific spell
```bash
curl http://localhost:3000/api/spells/fireball
```

### Get monsters with Challenge Rating 5
```bash
curl "http://localhost:3000/api/monsters?cr=5"
```

### Get rare items
```bash
curl "http://localhost:3000/api/items?rarity=Rare"
```

## Response Format

All endpoints return JSON responses with the following structure:

### List endpoints
```json
{
  "count": 10,
  "items": [
    {
      "name": "Item Name",
      "source": "PHB",
      ...
    }
  ]
}
```

### Single item endpoints
```json
{
  "name": "Item Name",
  "source": "PHB",
  ...
}
```

### Error responses
```json
{
  "error": "Descriptive error message"
}
```

## Data Sources

The API serves data from the 5eTools JSON files located in the `/data` directory. These include:

- `data/spells.json` - Spell data
- `data/class/class-index.json` - Character classes
- `data/races.json` - Character races
- `data/items.json` - Magic items and equipment
- `data/bestiary.json` - Monsters and creatures
- `data/feats.json` - Character feats
- `data/backgrounds.json` - Character backgrounds
- `data/actions.json` - Game actions and rules

## OpenAPI Specification

The API is documented using OpenAPI 3.0.0. You can access the specification at:
```
http://localhost:3000/api-docs
```

The specification is generated from JSDoc comments in `api/server.js` using swagger-jsdoc.

## Search and Filtering

Most endpoints support the following query parameters:

- **search** - Partial case-insensitive search by name
- **source** - Filter by source book (e.g., "PHB", "DMG", "MM")
- **Custom filters** - Each endpoint has specific filter options
  - Spells: `level`, `school`
  - Items: `rarity`, `type`
  - Monsters: `cr`, `type`

## Development

### Adding New Endpoints

1. Create the endpoint in `api/server.js`
2. Add JSDoc comments with `@swagger` tags to document it
3. The Swagger UI will automatically update

### Caching

The API caches loaded JSON data in memory for better performance. Data is only loaded from disk once.

## API Server vs. Static Server

This API server runs independently from the static web server (`npm run serve:dev`). You can run both simultaneously on different ports:

```bash
# Terminal 1 - API Server (port 3000)
npm run serve:api:dev

# Terminal 2 - Static Server (port 5050)
npm run serve:dev
```

## Limitations

- Search is limited to name matching (case-insensitive partial match)
- The API returns all matching results; pagination can be added if needed
- Some data relationships require multiple API calls

## License

MIT - See LICENSE file in the root directory
