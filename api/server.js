import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(projectRoot));

// Cache for loaded data
const dataCache = {};

/**
 * Load JSON data file
 */
function loadData(filename) {
	if (dataCache[filename]) {
		return dataCache[filename];
	}

	const filepath = path.join(projectRoot, 'data', filename);
	try {
		const content = fs.readFileSync(filepath, 'utf-8');
		const data = JSON.parse(content);
		dataCache[filename] = data;
		return data;
	} catch (error) {
		console.error(`Error loading ${filename}:`, error.message);
		return null;
	}
}

/**
 * Load multiple spell files and merge them
 */
function loadAllSpells() {
	if (dataCache['spells-all']) {
		return dataCache['spells-all'];
	}

	let allSpells = [];
	const spellsDir = path.join(projectRoot, 'data/spells');

	try {
		const files = fs.readdirSync(spellsDir);
		const spellFiles = files.filter(f => f.startsWith('spells-') && f.endsWith('.json'));

		for (const file of spellFiles) {
			const filepath = path.join(spellsDir, file);
			try {
				const content = fs.readFileSync(filepath, 'utf-8');
				const data = JSON.parse(content);
				if (data.spell && Array.isArray(data.spell)) {
					allSpells = allSpells.concat(data.spell);
				}
			} catch (e) {
				console.warn(`Error loading spell file ${file}:`, e.message);
			}
		}
	} catch (error) {
		console.error('Error reading spells directory:', error.message);
	}

	dataCache['spells-all'] = allSpells;
	return allSpells;
}

/**
 * Load all bestiary files and merge them
 */
function loadAllMonsters() {
	if (dataCache['monsters-all']) {
		return dataCache['monsters-all'];
	}

	let allMonsters = [];
	const bestiaryDir = path.join(projectRoot, 'data/bestiary');

	try {
		const files = fs.readdirSync(bestiaryDir);
		const monsterFiles = files.filter(f => f.startsWith('bestiary-') && f.endsWith('.json'));

		for (const file of monsterFiles) {
			const filepath = path.join(bestiaryDir, file);
			try {
				const content = fs.readFileSync(filepath, 'utf-8');
				const data = JSON.parse(content);
				if (data.monster && Array.isArray(data.monster)) {
					allMonsters = allMonsters.concat(data.monster);
				}
			} catch (e) {
				console.warn(`Error loading bestiary file ${file}:`, e.message);
			}
		}
	} catch (error) {
		console.error('Error reading bestiary directory:', error.message);
	}

	dataCache['monsters-all'] = allMonsters;
	return allMonsters;
}

/**
 * Get all items from a data array
 */
function getItems(dataObj, key) {
	if (!dataObj || !dataObj[key]) {
		return [];
	}
	return Array.isArray(dataObj[key]) ? dataObj[key] : [];
}

/**
 * Find item by name (case-insensitive partial match)
 */
function findItem(items, query) {
	if (!items || items.length === 0) return null;
	const lowerQuery = query.toLowerCase();
	return items.find(item =>
		item.name && item.name.toLowerCase().includes(lowerQuery)
	);
}

// ===== API ENDPOINTS =====

/**
 * @swagger
 * /api/spells:
 *   get:
 *     summary: Get all spells
 *     description: Retrieve a list of all D&D 5e spells. Results can be filtered by various parameters.
 *     tags:
 *       - Spells
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *         description: Filter spells by spell level
 *       - in: query
 *         name: school
 *         schema:
 *           type: string
 *         description: Filter spells by school of magic
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter spells by source book
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search spell by name (partial match)
 *     responses:
 *       200:
 *         description: List of spells
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 spells:
 *                   type: array
 *                   items:
 *                     type: object
 */
app.get('/api/spells', (req, res) => {
	const spells = loadAllSpells();
	if (!spells || spells.length === 0) {
		return res.status(404).json({ error: 'Spells data not found' });
	}

	let filtered = [...spells];
	const { level, school, source, search } = req.query;

	if (level !== undefined) {
		filtered = filtered.filter(s => s.level === parseInt(level));
	}
	if (school) {
		filtered = filtered.filter(s => s.school === school);
	}
	if (source) {
		filtered = filtered.filter(s => s.source === source);
	}
	if (search) {
		filtered = filtered.filter(s =>
			s.name && s.name.toLowerCase().includes(search.toLowerCase())
		);
	}

	res.json({ count: filtered.length, spells: filtered });
});

/**
 * @swagger
 * /api/spells/{name}:
 *   get:
 *     summary: Get a specific spell
 *     tags:
 *       - Spells
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Spell name
 *     responses:
 *       200:
 *         description: Spell details
 *       404:
 *         description: Spell not found
 */
app.get('/api/spells/:name', (req, res) => {
	const spells = loadAllSpells();
	if (!spells || spells.length === 0) {
		return res.status(404).json({ error: 'Spells data not found' });
	}

	const spell = findItem(spells, req.params.name);

	if (!spell) {
		return res.status(404).json({ error: `Spell "${req.params.name}" not found` });
	}

	res.json(spell);
});

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     description: Retrieve a list of all D&D 5e character classes
 *     tags:
 *       - Classes
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source book
 *     responses:
 *       200:
 *         description: List of classes
 */
app.get('/api/classes', (req, res) => {
	const classFile = path.join(projectRoot, 'data/class/class-index.json');
	try {
		const classIndexData = JSON.parse(fs.readFileSync(classFile, 'utf-8'));
		let classes = getItems(classIndexData, 'class') || [];
		const { source } = req.query;

		if (source) {
			classes = classes.filter(c => c.source === source);
		}

		res.json({ count: classes.length, classes });
	} catch (error) {
		res.status(404).json({ error: 'Classes data not found' });
	}
});

/**
 * @swagger
 * /api/classes/{name}:
 *   get:
 *     summary: Get a specific class
 *     tags:
 *       - Classes
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class details
 *       404:
 *         description: Class not found
 */
app.get('/api/classes/:name', (req, res) => {
	const classFile = path.join(projectRoot, 'data/class/class-index.json');
	try {
		const classIndexData = JSON.parse(fs.readFileSync(classFile, 'utf-8'));
		const classes = getItems(classIndexData, 'class');
		const cls = findItem(classes, req.params.name);

		if (!cls) {
			return res.status(404).json({ error: `Class "${req.params.name}" not found` });
		}

		res.json(cls);
	} catch (error) {
		res.status(404).json({ error: 'Classes data not found' });
	}
});

/**
 * @swagger
 * /api/races:
 *   get:
 *     summary: Get all races
 *     tags:
 *       - Races
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of races
 */
app.get('/api/races', (req, res) => {
	const racesData = loadData('races.json');
	if (!racesData) {
		return res.status(404).json({ error: 'Races data not found' });
	}

	let races = getItems(racesData, 'race') || [];
	const { source } = req.query;

	if (source) {
		races = races.filter(r => r.source === source);
	}

	res.json({ count: races.length, races });
});

/**
 * @swagger
 * /api/races/{name}:
 *   get:
 *     summary: Get a specific race
 *     tags:
 *       - Races
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Race details
 *       404:
 *         description: Race not found
 */
app.get('/api/races/:name', (req, res) => {
	const racesData = loadData('races.json');
	if (!racesData) {
		return res.status(404).json({ error: 'Races data not found' });
	}

	const races = getItems(racesData, 'race');
	const race = findItem(races, req.params.name);

	if (!race) {
		return res.status(404).json({ error: `Race "${req.params.name}" not found` });
	}

	res.json(race);
});

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags:
 *       - Items
 *     parameters:
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *         description: Filter by rarity (Common, Uncommon, Rare, Very Rare, Legendary, Artifact)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by item type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search item by name
 *     responses:
 *       200:
 *         description: List of items
 */
app.get('/api/items', (req, res) => {
	const itemsData = loadData('items.json');
	if (!itemsData) {
		return res.status(404).json({ error: 'Items data not found' });
	}

	let items = getItems(itemsData, 'item') || [];
	const { rarity, type, search } = req.query;

	if (rarity) {
		items = items.filter(i => i.rarity === rarity);
	}
	if (type) {
		items = items.filter(i => i.type === type);
	}
	if (search) {
		items = items.filter(i =>
			i.name && i.name.toLowerCase().includes(search.toLowerCase())
		);
	}

	res.json({ count: items.length, items });
});

/**
 * @swagger
 * /api/items/{name}:
 *   get:
 *     summary: Get a specific item
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
app.get('/api/items/:name', (req, res) => {
	const itemsData = loadData('items.json');
	if (!itemsData) {
		return res.status(404).json({ error: 'Items data not found' });
	}

	const items = getItems(itemsData, 'item');
	const item = findItem(items, req.params.name);

	if (!item) {
		return res.status(404).json({ error: `Item "${req.params.name}" not found` });
	}

	res.json(item);
});

/**
 * @swagger
 * /api/monsters:
 *   get:
 *     summary: Get all monsters
 *     tags:
 *       - Monsters
 *     parameters:
 *       - in: query
 *         name: cr
 *         schema:
 *           type: number
 *         description: Filter by Challenge Rating
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by creature type (Dragon, Humanoid, Beast, etc.)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source book
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search monster by name
 *     responses:
 *       200:
 *         description: List of monsters
 */
app.get('/api/monsters', (req, res) => {
	const monsters = loadAllMonsters();
	if (!monsters || monsters.length === 0) {
		return res.status(404).json({ error: 'Monsters data not found' });
	}

	let filtered = [...monsters];
	const { cr, type, source, search } = req.query;

	if (cr !== undefined) {
		filtered = filtered.filter(m => m.cr === parseFloat(cr));
	}
	if (type) {
		filtered = filtered.filter(m => m.type === type);
	}
	if (source) {
		filtered = filtered.filter(m => m.source === source);
	}
	if (search) {
		filtered = filtered.filter(m =>
			m.name && m.name.toLowerCase().includes(search.toLowerCase())
		);
	}

	res.json({ count: filtered.length, monsters: filtered });
});

/**
 * @swagger
 * /api/monsters/{name}:
 *   get:
 *     summary: Get a specific monster
 *     tags:
 *       - Monsters
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monster details
 *       404:
 *         description: Monster not found
 */
app.get('/api/monsters/:name', (req, res) => {
	const monsters = loadAllMonsters();
	if (!monsters || monsters.length === 0) {
		return res.status(404).json({ error: 'Monsters data not found' });
	}

	const monster = findItem(monsters, req.params.name);

	if (!monster) {
		return res.status(404).json({ error: `Monster "${req.params.name}" not found` });
	}

	res.json(monster);
});

/**
 * @swagger
 * /api/feats:
 *   get:
 *     summary: Get all feats
 *     tags:
 *       - Feats
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of feats
 */
app.get('/api/feats', (req, res) => {
	const featsData = loadData('feats.json');
	if (!featsData) {
		return res.status(404).json({ error: 'Feats data not found' });
	}

	let feats = getItems(featsData, 'feat') || [];
	const { source } = req.query;

	if (source) {
		feats = feats.filter(f => f.source === source);
	}

	res.json({ count: feats.length, feats });
});

/**
 * @swagger
 * /api/feats/{name}:
 *   get:
 *     summary: Get a specific feat
 *     tags:
 *       - Feats
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feat details
 *       404:
 *         description: Feat not found
 */
app.get('/api/feats/:name', (req, res) => {
	const featsData = loadData('feats.json');
	if (!featsData) {
		return res.status(404).json({ error: 'Feats data not found' });
	}

	const feats = getItems(featsData, 'feat');
	const feat = findItem(feats, req.params.name);

	if (!feat) {
		return res.status(404).json({ error: `Feat "${req.params.name}" not found` });
	}

	res.json(feat);
});

/**
 * @swagger
 * /api/backgrounds:
 *   get:
 *     summary: Get all backgrounds
 *     tags:
 *       - Backgrounds
 *     responses:
 *       200:
 *         description: List of backgrounds
 */
app.get('/api/backgrounds', (req, res) => {
	const backgroundsData = loadData('backgrounds.json');
	if (!backgroundsData) {
		return res.status(404).json({ error: 'Backgrounds data not found' });
	}

	const backgrounds = getItems(backgroundsData, 'background') || [];
	res.json({ count: backgrounds.length, backgrounds });
});

/**
 * @swagger
 * /api/backgrounds/{name}:
 *   get:
 *     summary: Get a specific background
 *     tags:
 *       - Backgrounds
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Background details
 *       404:
 *         description: Background not found
 */
app.get('/api/backgrounds/:name', (req, res) => {
	const backgroundsData = loadData('backgrounds.json');
	if (!backgroundsData) {
		return res.status(404).json({ error: 'Backgrounds data not found' });
	}

	const backgrounds = getItems(backgroundsData, 'background');
	const background = findItem(backgrounds, req.params.name);

	if (!background) {
		return res.status(404).json({ error: `Background "${req.params.name}" not found` });
	}

	res.json(background);
});

/**
 * @swagger
 * /api/actions:
 *   get:
 *     summary: Get all actions
 *     tags:
 *       - Actions
 *     responses:
 *       200:
 *         description: List of actions
 */
app.get('/api/actions', (req, res) => {
	const actionsData = loadData('actions.json');
	if (!actionsData) {
		return res.status(404).json({ error: 'Actions data not found' });
	}

	const actions = getItems(actionsData, 'action') || [];
	res.json({ count: actions.length, actions });
});

/**
 * @swagger
 * /api/actions/{name}:
 *   get:
 *     summary: Get a specific action
 *     tags:
 *       - Actions
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action details
 *       404:
 *         description: Action not found
 */
app.get('/api/actions/:name', (req, res) => {
	const actionsData = loadData('actions.json');
	if (!actionsData) {
		return res.status(404).json({ error: 'Actions data not found' });
	}

	const actions = getItems(actionsData, 'action');
	const action = findItem(actions, req.params.name);

	if (!action) {
		return res.status(404).json({ error: `Action "${req.params.name}" not found` });
	}

	res.json(action);
});

// Swagger documentation
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: '5eTools D&D API',
			version: '1.0.0',
			description: 'REST API for accessing Dungeons & Dragons 5e reference data (classes, races, spells, items, monsters, feats, and more)',
			contact: {
				name: '5eTools',
				url: 'https://5e.tools'
			}
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server'
			}
		],
		tags: [
			{
				name: 'Spells',
				description: 'D&D spell data'
			},
			{
				name: 'Classes',
				description: 'Character classes'
			},
			{
				name: 'Races',
				description: 'Character races'
			},
			{
				name: 'Items',
				description: 'Magic items and equipment'
			},
			{
				name: 'Monsters',
				description: 'Creatures and bestiary'
			},
			{
				name: 'Feats',
				description: 'Character feats and abilities'
			},
			{
				name: 'Backgrounds',
				description: 'Character backgrounds'
			},
			{
				name: 'Actions',
				description: 'Game actions and rules'
			}
		]
	},
	apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: '5eTools D&D API',
		version: '1.0.0',
		documentation: 'http://localhost:3000/api-docs',
		endpoints: {
			spells: '/api/spells',
			classes: '/api/classes',
			races: '/api/races',
			items: '/api/items',
			monsters: '/api/monsters',
			feats: '/api/feats',
			backgrounds: '/api/backgrounds',
			actions: '/api/actions'
		}
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
	console.log(`5eTools API Server running on http://localhost:${PORT}`);
	console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});


/**
 * Get all items from a data array
 */
function getItems(dataObj, key) {
	if (!dataObj || !dataObj[key]) {
		return [];
	}
	return Array.isArray(dataObj[key]) ? dataObj[key] : [];
}

/**
 * Find item by name (case-insensitive partial match)
 */
function findItem(items, query) {
	if (!items || items.length === 0) return null;
	const lowerQuery = query.toLowerCase();
	return items.find(item =>
		item.name && item.name.toLowerCase().includes(lowerQuery)
	);
}

// ===== API ENDPOINTS =====

/**
 * @swagger
 * /api/spells:
 *   get:
 *     summary: Get all spells
 *     description: Retrieve a list of all D&D 5e spells. Results can be filtered by various parameters.
 *     tags:
 *       - Spells
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 9
 *         description: Filter spells by spell level
 *       - in: query
 *         name: school
 *         schema:
 *           type: string
 *         description: Filter spells by school of magic
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter spells by source book
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search spell by name (partial match)
 *     responses:
 *       200:
 *         description: List of spells
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 spells:
 *                   type: array
 *                   items:
 *                     type: object
 */
app.get('/api/spells', (req, res) => {
	const spellsData = loadData('spells.json');
	if (!spellsData) {
		return res.status(404).json({ error: 'Spells data not found' });
	}

	let spells = getItems(spellsData, 'spell') || [];
	const { level, school, source, search } = req.query;

	if (level !== undefined) {
		spells = spells.filter(s => s.level === parseInt(level));
	}
	if (school) {
		spells = spells.filter(s => s.school === school);
	}
	if (source) {
		spells = spells.filter(s => s.source === source);
	}
	if (search) {
		spells = spells.filter(s =>
			s.name && s.name.toLowerCase().includes(search.toLowerCase())
		);
	}

	res.json({ count: spells.length, spells });
});

/**
 * @swagger
 * /api/spells/{name}:
 *   get:
 *     summary: Get a specific spell
 *     tags:
 *       - Spells
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Spell name
 *     responses:
 *       200:
 *         description: Spell details
 *       404:
 *         description: Spell not found
 */
app.get('/api/spells/:name', (req, res) => {
	const spellsData = loadData('spells.json');
	if (!spellsData) {
		return res.status(404).json({ error: 'Spells data not found' });
	}

	const spells = getItems(spellsData, 'spell');
	const spell = findItem(spells, req.params.name);

	if (!spell) {
		return res.status(404).json({ error: 'Spell not found' });
	}

	res.json(spell);
});

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     description: Retrieve a list of all D&D 5e character classes
 *     tags:
 *       - Classes
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source book
 *     responses:
 *       200:
 *         description: List of classes
 */
app.get('/api/classes', (req, res) => {
	const classFile = path.join(projectRoot, 'data/class/class-index.json');
	try {
		const classIndexData = JSON.parse(fs.readFileSync(classFile, 'utf-8'));
		let classes = getItems(classIndexData, 'class') || [];
		const { source } = req.query;

		if (source) {
			classes = classes.filter(c => c.source === source);
		}

		res.json({ count: classes.length, classes });
	} catch (error) {
		res.status(404).json({ error: 'Classes data not found' });
	}
});

/**
 * @swagger
 * /api/classes/{name}:
 *   get:
 *     summary: Get a specific class
 *     tags:
 *       - Classes
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class details
 *       404:
 *         description: Class not found
 */
app.get('/api/classes/:name', (req, res) => {
	const classFile = path.join(projectRoot, 'data/class/class-index.json');
	try {
		const classIndexData = JSON.parse(fs.readFileSync(classFile, 'utf-8'));
		const classes = getItems(classIndexData, 'class');
		const cls = findItem(classes, req.params.name);

		if (!cls) {
			return res.status(404).json({ error: 'Class not found' });
		}

		res.json(cls);
	} catch (error) {
		res.status(404).json({ error: 'Classes data not found' });
	}
});

/**
 * @swagger
 * /api/races:
 *   get:
 *     summary: Get all races
 *     tags:
 *       - Races
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of races
 */
app.get('/api/races', (req, res) => {
	const racesData = loadData('races.json');
	if (!racesData) {
		return res.status(404).json({ error: 'Races data not found' });
	}

	let races = getItems(racesData, 'race') || [];
	const { source } = req.query;

	if (source) {
		races = races.filter(r => r.source === source);
	}

	res.json({ count: races.length, races });
});

/**
 * @swagger
 * /api/races/{name}:
 *   get:
 *     summary: Get a specific race
 *     tags:
 *       - Races
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Race details
 *       404:
 *         description: Race not found
 */
app.get('/api/races/:name', (req, res) => {
	const racesData = loadData('races.json');
	if (!racesData) {
		return res.status(404).json({ error: 'Races data not found' });
	}

	const races = getItems(racesData, 'race');
	const race = findItem(races, req.params.name);

	if (!race) {
		return res.status(404).json({ error: 'Race not found' });
	}

	res.json(race);
});

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags:
 *       - Items
 *     parameters:
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *         description: Filter by rarity (Common, Uncommon, Rare, Very Rare, Legendary, Artifact)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by item type
 *     responses:
 *       200:
 *         description: List of items
 */
app.get('/api/items', (req, res) => {
	const itemsData = loadData('items.json');
	if (!itemsData) {
		return res.status(404).json({ error: 'Items data not found' });
	}

	let items = getItems(itemsData, 'item') || [];
	const { rarity, type } = req.query;

	if (rarity) {
		items = items.filter(i => i.rarity === rarity);
	}
	if (type) {
		items = items.filter(i => i.type === type);
	}

	res.json({ count: items.length, items });
});

/**
 * @swagger
 * /api/items/{name}:
 *   get:
 *     summary: Get a specific item
 *     tags:
 *       - Items
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
app.get('/api/items/:name', (req, res) => {
	const itemsData = loadData('items.json');
	if (!itemsData) {
		return res.status(404).json({ error: 'Items data not found' });
	}

	const items = getItems(itemsData, 'item');
	const item = findItem(items, req.params.name);

	if (!item) {
		return res.status(404).json({ error: 'Item not found' });
	}

	res.json(item);
});

/**
 * @swagger
 * /api/monsters:
 *   get:
 *     summary: Get all monsters
 *     tags:
 *       - Monsters
 *     parameters:
 *       - in: query
 *         name: cr
 *         schema:
 *           type: number
 *         description: Filter by Challenge Rating
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by creature type (Dragon, Humanoid, Beast, etc.)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source book
 *     responses:
 *       200:
 *         description: List of monsters
 */
app.get('/api/monsters', (req, res) => {
	const monstersData = loadData('bestiary.json');
	if (!monstersData) {
		return res.status(404).json({ error: 'Monsters data not found' });
	}

	let monsters = getItems(monstersData, 'monster') || [];
	const { cr, type, source } = req.query;

	if (cr !== undefined) {
		monsters = monsters.filter(m => m.cr === parseFloat(cr));
	}
	if (type) {
		monsters = monsters.filter(m => m.type === type);
	}
	if (source) {
		monsters = monsters.filter(m => m.source === source);
	}

	res.json({ count: monsters.length, monsters });
});

/**
 * @swagger
 * /api/monsters/{name}:
 *   get:
 *     summary: Get a specific monster
 *     tags:
 *       - Monsters
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monster details
 *       404:
 *         description: Monster not found
 */
app.get('/api/monsters/:name', (req, res) => {
	const monstersData = loadData('bestiary.json');
	if (!monstersData) {
		return res.status(404).json({ error: 'Monsters data not found' });
	}

	const monsters = getItems(monstersData, 'monster');
	const monster = findItem(monsters, req.params.name);

	if (!monster) {
		return res.status(404).json({ error: 'Monster not found' });
	}

	res.json(monster);
});

/**
 * @swagger
 * /api/feats:
 *   get:
 *     summary: Get all feats
 *     tags:
 *       - Feats
 *     parameters:
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of feats
 */
app.get('/api/feats', (req, res) => {
	const featsData = loadData('feats.json');
	if (!featsData) {
		return res.status(404).json({ error: 'Feats data not found' });
	}

	let feats = getItems(featsData, 'feat') || [];
	const { source } = req.query;

	if (source) {
		feats = feats.filter(f => f.source === source);
	}

	res.json({ count: feats.length, feats });
});

/**
 * @swagger
 * /api/feats/{name}:
 *   get:
 *     summary: Get a specific feat
 *     tags:
 *       - Feats
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feat details
 *       404:
 *         description: Feat not found
 */
app.get('/api/feats/:name', (req, res) => {
	const featsData = loadData('feats.json');
	if (!featsData) {
		return res.status(404).json({ error: 'Feats data not found' });
	}

	const feats = getItems(featsData, 'feat');
	const feat = findItem(feats, req.params.name);

	if (!feat) {
		return res.status(404).json({ error: 'Feat not found' });
	}

	res.json(feat);
});

/**
 * @swagger
 * /api/backgrounds:
 *   get:
 *     summary: Get all backgrounds
 *     tags:
 *       - Backgrounds
 *     responses:
 *       200:
 *         description: List of backgrounds
 */
app.get('/api/backgrounds', (req, res) => {
	const backgroundsData = loadData('backgrounds.json');
	if (!backgroundsData) {
		return res.status(404).json({ error: 'Backgrounds data not found' });
	}

	const backgrounds = getItems(backgroundsData, 'background') || [];
	res.json({ count: backgrounds.length, backgrounds });
});

/**
 * @swagger
 * /api/backgrounds/{name}:
 *   get:
 *     summary: Get a specific background
 *     tags:
 *       - Backgrounds
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Background details
 *       404:
 *         description: Background not found
 */
app.get('/api/backgrounds/:name', (req, res) => {
	const backgroundsData = loadData('backgrounds.json');
	if (!backgroundsData) {
		return res.status(404).json({ error: 'Backgrounds data not found' });
	}

	const backgrounds = getItems(backgroundsData, 'background');
	const background = findItem(backgrounds, req.params.name);

	if (!background) {
		return res.status(404).json({ error: 'Background not found' });
	}

	res.json(background);
});

/**
 * @swagger
 * /api/actions:
 *   get:
 *     summary: Get all actions
 *     tags:
 *       - Actions
 *     responses:
 *       200:
 *         description: List of actions
 */
app.get('/api/actions', (req, res) => {
	const actionsData = loadData('actions.json');
	if (!actionsData) {
		return res.status(404).json({ error: 'Actions data not found' });
	}

	const actions = getItems(actionsData, 'action') || [];
	res.json({ count: actions.length, actions });
});

/**
 * @swagger
 * /api/actions/{name}:
 *   get:
 *     summary: Get a specific action
 *     tags:
 *       - Actions
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action details
 *       404:
 *         description: Action not found
 */
app.get('/api/actions/:name', (req, res) => {
	const actionsData = loadData('actions.json');
	if (!actionsData) {
		return res.status(404).json({ error: 'Actions data not found' });
	}

	const actions = getItems(actionsData, 'action');
	const action = findItem(actions, req.params.name);

	if (!action) {
		return res.status(404).json({ error: 'Action not found' });
	}

	res.json(action);
});

// Swagger documentation
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: '5eTools D&D API',
			version: '1.0.0',
			description: 'REST API for accessing Dungeons & Dragons 5e reference data (classes, races, spells, items, monsters, feats, and more)',
			contact: {
				name: '5eTools',
				url: 'https://5e.tools'
			}
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'Development server'
			}
		],
		tags: [
			{
				name: 'Spells',
				description: 'D&D spell data'
			},
			{
				name: 'Classes',
				description: 'Character classes'
			},
			{
				name: 'Races',
				description: 'Character races'
			},
			{
				name: 'Items',
				description: 'Magic items and equipment'
			},
			{
				name: 'Monsters',
				description: 'Creatures and bestiary'
			},
			{
				name: 'Feats',
				description: 'Character feats and abilities'
			},
			{
				name: 'Backgrounds',
				description: 'Character backgrounds'
			},
			{
				name: 'Actions',
				description: 'Game actions and rules'
			}
		]
	},
	apis: [__filename]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: '5eTools D&D API',
		version: '1.0.0',
		documentation: 'http://localhost:3000/api-docs',
		endpoints: {
			spells: '/api/spells',
			classes: '/api/classes',
			races: '/api/races',
			items: '/api/items',
			monsters: '/api/monsters',
			feats: '/api/feats',
			backgrounds: '/api/backgrounds',
			actions: '/api/actions'
		}
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
	console.log(`5eTools API Server running on http://localhost:${PORT}`);
	console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});
